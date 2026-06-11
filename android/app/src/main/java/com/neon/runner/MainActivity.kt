package com.neon.runner

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neon.runner.components.NeonRunnerGame
import com.neon.runner.components.SkinShop
import com.neon.runner.data.SKINS
import com.neon.runner.data.Skin
import com.neon.runner.types.GameState
import com.neon.runner.utils.SoundManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var soundManager: SoundManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        soundManager = SoundManager(this)

        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF020208)
                ) {
                    GameEntryHost(
                        context = this,
                        soundManager = soundManager
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        soundManager.release()
    }
}

@Composable
fun GameEntryHost(
    context: Context,
    soundManager: SoundManager
) {
    val sharedPrefs = remember {
        context.getSharedPreferences("neon_runner_prefs", Context.MODE_PRIVATE)
    }

    val coroutineScope = rememberCoroutineScope()

    // 1. Core Reactive Storage States
    var gameState by remember { mutableStateOf(GameState.MENU) }
    var currentScore by remember { mutableStateOf(0) }
    var runShardsGained by remember { mutableStateOf(0) }

    // Persistent balances
    var highScore by remember { mutableStateOf(sharedPrefs.getInt("neon_runner_highscore", 0)) }
    var cumulativeShards by remember { mutableStateOf(sharedPrefs.getInt("neon_runner_shards", 0)) }
    
    val defaultUnlocked = remember { setOf("cyan_dynamo") }
    var unlockedSkinIds by remember {
        val saved = sharedPrefs.getStringSet("neon_runner_unlocked_skins", defaultUnlocked)
        mutableStateOf(saved?.toList() ?: listOf("cyan_dynamo"))
    }
    
    var activeSkin by remember {
        val savedId = sharedPrefs.getString("neon_runner_active_skin", "cyan_dynamo")
        val skin = SKINS.find { it.id == savedId } ?: SKINS[0]
        mutableStateOf(skin)
    }

    var isMuted by remember {
        mutableStateOf(sharedPrefs.getBoolean("neon_runner_muted", false))
    }

    // Revives trackers
    var hasRevivedInRun by remember { mutableStateOf(false) }
    var triggerRevive by remember { mutableStateOf(false) }

    // Shop visibility state
    var isShopOpen by remember { mutableStateOf(false) }

    // Game Over count & Ad integrations models
    var gameOverCount by remember { mutableStateOf(sharedPrefs.getInt("neon_runner_gameover_count", 0)) }
    var isInterstitialAdPlaying by remember { mutableStateOf(false) }
    var interstitialTimer by remember { mutableStateOf(5) }

    var isReviveAdPlaying by remember { mutableStateOf(false) }
    var reviveAdTimer by remember { mutableStateOf(5) }

    // 2. Multiplier & states persist hooks
    fun saveStringList(key: String, list: List<String>) {
        sharedPrefs.edit().putStringSet(key, list.toSet()).apply()
    }

    fun handlePurchaseSkin(skin: Skin) {
        if (cumulativeShards >= skin.cost && !unlockedSkinIds.contains(skin.id)) {
            soundManager.playBuy()
            val nextShards = cumulativeShards - skin.cost
            cumulativeShards = nextShards
            sharedPrefs.edit().putInt("neon_runner_shards", nextShards).apply()

            val nextUnlocked = unlockedSkinIds + skin.id
            unlockedSkinIds = nextUnlocked
            saveStringList("neon_runner_unlocked_skins", nextUnlocked)

            activeSkin = skin
            sharedPrefs.edit().putString("neon_runner_active_skin", skin.id).apply()
        }
    }

    fun handleSelectSkin(skin: Skin) {
        if (unlockedSkinIds.contains(skin.id)) {
            soundManager.playBuy()
            activeSkin = skin
            sharedPrefs.edit().putString("neon_runner_active_skin", skin.id).apply()
        }
    }

    fun handleReviveSuccess(method: String) {
        if (method == "shards") {
            val nextShards = maxOf(0, cumulativeShards - 5)
            cumulativeShards = nextShards
            sharedPrefs.edit().putInt("neon_runner_shards", nextShards).apply()
        }

        hasRevivedInRun = true
        triggerRevive = true
        gameState = GameState.PLAYING
    }

    fun handleSettleDeclineRevive() {
        val nextCount = gameOverCount + 1
        gameOverCount = nextCount
        sharedPrefs.edit().putInt("neon_runner_gameover_count", nextCount).apply()

        // Sync high scores
        if (currentScore > highScore) {
            highScore = currentScore
            sharedPrefs.edit().putInt("neon_runner_highscore", currentScore).apply()
        }

        // Trigger interstitial sponsor ads if games exceed 5
        if (nextCount >= 5) {
            interstitialTimer = 5
            isInterstitialAdPlaying = true
        } else {
            gameState = GameState.GAMEOVER
        }
    }

    fun handleGamePlayFinish(finalScore: Int, gained: Int) {
        // Multiplier addition
        val nextShards = cumulativeShards + gained
        cumulativeShards = nextShards
        sharedPrefs.edit().putInt("neon_runner_shards", nextShards).apply()

        // Sync high scores
        if (finalScore > highScore) {
            highScore = finalScore
            sharedPrefs.edit().putInt("neon_runner_highscore", finalScore).apply()
        }

        val nextCount = gameOverCount + 1
        gameOverCount = nextCount
        sharedPrefs.edit().putInt("neon_runner_gameover_count", nextCount).apply()

        if (nextCount >= 5) {
            interstitialTimer = 5
            isInterstitialAdPlaying = true
        } else {
            gameState = GameState.GAMEOVER
        }
    }

    // 3. Simulated Ad interval clock tickers
    LaunchedEffect(isReviveAdPlaying) {
        if (isReviveAdPlaying) {
            reviveAdTimer = 5
            while (reviveAdTimer > 0) {
                delay(1000L)
                reviveAdTimer--
            }
            isReviveAdPlaying = false
            handleReviveSuccess("ad")
        }
    }

    LaunchedEffect(isInterstitialAdPlaying) {
        if (isInterstitialAdPlaying) {
            interstitialTimer = 5
            while (interstitialTimer > 0) {
                delay(1000L)
                interstitialTimer--
            }
        }
    }

    fun handleToggleMute() {
        val nextMute = !isMuted
        isMuted = nextMute
        sharedPrefs.edit().putBoolean("neon_runner_muted", nextMute).apply()
    }

    // Core Screen UI Scaffold layout
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF020208))
    ) {
        // Draw the custom background game loop canvas rendering layers
        NeonRunnerGame(
            gameState = gameState,
            activeSkin = activeSkin,
            isMuted = isMuted,
            onScoreChange = { currentScore = it },
            onShardCollect = { runShardsGained = it },
            onGameOver = { fScore, fShards -> handleGamePlayFinish(fScore, fShards) },
            onStateChange = { newState ->
                if (newState == GameState.PLAYING || newState == GameState.MENU) {
                    if (gameOverCount >= 5) {
                        interstitialTimer = 5
                        isInterstitialAdPlaying = true
                        return@NeonRunnerGame
                    }
                }
                gameState = newState
                if (newState == GameState.PLAYING) {
                    if (!triggerRevive) {
                        hasRevivedInRun = false
                        runShardsGained = 0
                    }
                }
            },
            soundManager = soundManager,
            hasRevivedInRun = hasRevivedInRun,
            triggerRevive = triggerRevive,
            onReviveComplete = { triggerRevive = false },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay 1: Live HUD (PLAYING mode)
        if (gameState == GameState.PLAYING) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = "SCORE: $currentScore",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = "SHARDS COLLECTED: $runShardsGained",
                        color = Color(0xFFFFAA00),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Volume Action toggle
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xE60A0A16))
                        .clickable { handleToggleMute() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (isMuted) "🔇" else "🔊",
                        fontSize = 15.sp
                    )
                }
            }
        }

        // Overlay 2: MAIN MENU overlays
        if (gameState == GameState.MENU && !isShopOpen) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xCC020208))
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Neon Title Text
                Text(
                    text = "NEON RUNNER",
                    color = Color(0xFF00FFFF),
                    fontSize = 32.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(bottom = 4.dp)
                )

                Text(
                    text = "NATIVE KOTLIN PORT // JETPACK COMPOSE",
                    color = Color(0xFFFF007F),
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 24.dp)
                )

                // High score layout container
                Row(
                    modifier = Modifier
                        .background(Color(0xFF0A0A16), RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFF00FFFF).copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                        .widthIn(max = 300.dp),
                    horizontalArrangement = Arrangement.SpaceAround,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("★ HIGHSCORE", color = Color.Gray, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                        Text("$highScore PTS", color = Color.Yellow, fontSize = 16.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Black)
                    }
                    Box(modifier = Modifier.width(1.dp).height(24.dp).background(Color.Gray.copy(alpha = 0.3f)))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("◆ TOTAL SHARDS", color = Color.Gray, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                        Text("$cumulativeShards", color = Color(0xFFFFAA00), fontSize = 16.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Black)
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                // Action Buttons
                Button(
                    onClick = { gameState = GameState.PLAYING },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.width(220.dp)
                ) {
                    Text("START RUN", color = Color.White, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = { isShopOpen = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E1E2E)),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.width(220.dp)
                ) {
                    Text("SKIN CORES SHOP", color = Color.White, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Mute state clicker link
                Row(
                    modifier = Modifier.clickable { handleToggleMute() },
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isMuted) "🔇 SYSTEM AUDIO MUTED" else "🔊 SYSTEM AUDIO LIVE",
                        color = Color.Gray,
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }

        // Overlay 3: SKIN SHOP (Compose layout integration)
        if (isShopOpen) {
            SkinShop(
                cumulativeShards = cumulativeShards,
                unlockedSkinIds = unlockedSkinIds,
                activeSkin = activeSkin,
                onPurchaseSkin = { handlePurchaseSkin(it) },
                onSelectSkin = { handleSelectSkin(it) },
                onBackToMenu = { isShopOpen = false }
            )
        }

        // Overlay 4: REVIVING menu
        if (gameState == GameState.REVIVING) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xEA020208)),
                contentAlignment = Alignment.Center
            ) {
                if (isReviveAdPlaying) {
                    // Watch simulated Video ad
                    Column(
                        modifier = Modifier
                            .width(340.dp)
                            .background(Color(0xFF0F0F24), RoundedCornerShape(16.dp))
                            .border(1.dp, Color(0xFFFF007F).copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "LOADING SPONSOR TRANSMISSION...",
                            color = Color(0xFFFF007F),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )
                        
                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = "[Simulated Video Ad: ${reviveAdTimer}s remaining]",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Progress timer bar
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Color.Black)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(fraction = (5f - reviveAdTimer) / 5f)
                                    .background(Color(0xFFFF007F))
                            )
                        }
                    }
                } else {
                    // Option selection details
                    Column(
                        modifier = Modifier
                            .width(320.dp)
                            .background(Color(0xFF0C0C1A), RoundedCornerShape(16.dp))
                            .border(2.dp, Color(0xFFFF007F), RoundedCornerShape(16.dp))
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "CHASSIS SYNC INTERRUPTED",
                            color = Color(0xFF00FFFF),
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier
                                .background(Color(0x1A00FFFF), RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "RECONSTRUCT AVATAR?",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black
                        )

                        Text(
                            text = "SPEND 5 SHARDS OR WATCH A DEV TRANSMISSION TO CONTINUE YOUR CURRENT RUN",
                            color = Color.LightGray,
                            fontSize = 9.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )

                        // Current score show box
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.Black, RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "CURRENT SCORE: $currentScore PTS",
                                color = Color.Yellow,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Option 1: Buy back with shards
                        Button(
                            onClick = { handleReviveSuccess("shards") },
                            enabled = cumulativeShards >= 5,
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF00FFFF),
                                contentColor = Color.Black,
                                disabledContainerColor = Color.DarkGray,
                                disabledContentColor = Color.LightGray
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "SPEND 5 SHARDS (BAL: $cumulativeShards)",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Option 2: Watch ad
                        Button(
                            onClick = { isReviveAdPlaying = true },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF007F),
                                contentColor = Color.White
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "WATCH SPONSOR TRANSMISSION",
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "No thanks, End Game",
                            color = Color.Gray,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.clickable { handleSettleDeclineRevive() }
                        )
                    }
                }
            }
        }

        // Overlay 5: GAME OVER State HUD
        if (gameState == GameState.GAMEOVER) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xD9020208))
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "CHASSIS UNRECOVERABLE",
                    color = Color.Red,
                    fontSize = 18.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(bottom = 4.dp)
                )

                Text(
                    text = "TERMINAL CODE G_CRASH",
                    color = Color.Gray,
                    fontSize = 9.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Stats summaries
                Column(
                    modifier = Modifier
                        .background(Color(0xFF0C0C1A), RoundedCornerShape(12.dp))
                        .padding(16.dp)
                        .width(220.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("FINAL SCORE", color = Color.Gray, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                    Text("$currentScore PTS", color = Color.Yellow, fontSize = 20.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Black)

                    Spacer(modifier = Modifier.height(10.dp))

                    Text("SHARDS COLLECTED", color = Color.Gray, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                    Text("+$runShardsGained", color = Color(0xFFFFAA00), fontSize = 14.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { gameState = GameState.PLAYING },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF007F)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.width(200.dp)
                ) {
                    Text("RE-BOOT CODE (G_RETRY)", fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = { gameState = GameState.MENU },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E1E2E)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.width(200.dp)
                ) {
                    Text("EXIT TO LOBBY TERMINAL", fontSize = 10.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Overlay 6: FULL SCREEN SPONSOR INTERSTITIAL AD OVERLAY
        if (isInterstitialAdPlaying) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xFF020208))
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(420.dp)
                        .background(Color(0xFA090915), RoundedCornerShape(24.dp))
                        .border(2.dp, Color(0xFF00FFFF), RoundedCornerShape(24.dp))
                        .padding(28.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        
                        Text(
                            text = "LOADING SPONSOR TRANSMISSION...",
                            color = Color(0xFF00FFFF),
                            fontSize = 13.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color.Black, RoundedCornerShape(14.dp))
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "[Simulated Video Ad: ${interstitialTimer}s remaining]",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Black
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = "GET ULTRA-CHARGED CYBER GLOW DRINK. FUEL YOUR QUANTUM LIGHT SPEED RUN!",
                                    color = Color.LightGray,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Medium,
                                    textAlign = TextAlign.Center,
                                    lineHeight = 11.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Progress timer countdown bar
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(Color.Black)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(fraction = (5f - interstitialTimer) / 5f)
                                    .background(Color(0xFF00FFFF))
                            )
                        }

                        Spacer(modifier = Modifier.height(20.dp))

                        if (interstitialTimer == 0) {
                            Button(
                                onClick = {
                                    gameOverCount = 0
                                    sharedPrefs.edit().putInt("neon_runner_gameover_count", 0).apply()
                                    isInterstitialAdPlaying = false
                                    gameState = GameState.MENU
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFFAA00)),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "CLOSE AD",
                                    color = Color.Black,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        } else {
                            Text(
                                text = "SATELLITE SIGNAL OPTIMIZING... ${interstitialTimer}S",
                                color = Color.Gray,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }
        }
    }
}
