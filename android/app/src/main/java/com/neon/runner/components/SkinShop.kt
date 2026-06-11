package com.neon.runner.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import com.neon.runner.data.Skin
import com.neon.runner.data.SKINS

@Composable
fun SkinShop(
    cumulativeShards: Int,
    unlockedSkinIds: List<String>,
    activeSkin: Skin,
    onPurchaseSkin: (Skin) -> Unit,
    onSelectSkin: (Skin) -> Unit,
    onBackToMenu: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF020208))
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Shop Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(
                onClick = onBackToMenu,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1E1E2E),
                    contentColor = Color.White
                ),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "< BACK",
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "CYBERNETIC CORES SHOP",
                color = Color.White,
                fontSize = 18.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Black,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center
            )

            // Cumulative Balance Display
            Row(
                modifier = Modifier
                    .background(Color(0xFF0F0F1E), RoundedCornerShape(12.dp))
                    .border(1.dp, Color(0xFFFFAA00).copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "◆ ",
                    color = Color(0xFFFFAA00),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "$cumulativeShards SHARDS",
                    color = Color.White,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.ExtraBold
                )
            }
        }

        // Subtitle instructions
        Text(
            text = "EXCHANGE SPARKING REACTION ELEMENTS FOR STYLISH RETRO PARTICLES TRAILS",
            color = Color.Gray,
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            modifier = Modifier.padding(bottom = 16.dp),
            textAlign = TextAlign.Center
        )

        // Skins Grid Loader
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 160.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            items(SKINS) { skin ->
                val isUnlocked = unlockedSkinIds.contains(skin.id)
                val isActive = activeSkin.id == skin.id

                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF0A0A16))
                        .border(
                            2.dp,
                            if (isActive) skin.color else if (isUnlocked) Color(0xFF33334F) else Color(0x33ffffff),
                            RoundedCornerShape(14.dp)
                        )
                        .clickable {
                            if (isUnlocked) {
                                onSelectSkin(skin)
                            } else if (cumulativeShards >= skin.cost) {
                                onPurchaseSkin(skin)
                            }
                        }
                        .padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Preview Circle representing active glow color skin sphere
                    Box(
                        modifier = Modifier
                            .size(45.dp)
                            .shadow(
                                elevation = 12.dp,
                                shape = RoundedCornerShape(22.dp),
                                clip = false,
                                ambientColor = skin.color,
                                spotColor = skin.color
                            )
                            .background(
                                Brush.radialGradient(
                                    colors = listOf(skin.color, skin.secondaryColor)
                                ),
                                RoundedCornerShape(22.dp)
                            )
                            .border(2.dp, Color.White.copy(alpha = 0.6f), RoundedCornerShape(22.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        // Inner pulsing core star
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(Color.White, RoundedCornerShape(6.dp))
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Skin title
                    Text(
                        text = skin.name,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )

                    // Skin description
                    Text(
                        text = skin.description,
                        color = Color.LightGray,
                        fontSize = 8.5.sp,
                        fontFamily = FontFamily.SansSerif,
                        modifier = Modifier
                            .padding(vertical = 4.dp)
                            .height(28.dp),
                        textAlign = TextAlign.Center,
                        lineHeight = 9.sp
                    )
                    
                    Text(
                        text = "Trail: ${skin.trailType.name}",
                        color = skin.color.copy(alpha = 0.8f),
                        fontSize = 8.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(bottom = 6.dp)
                    )

                    // CTA button / labels
                    when {
                        isActive -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(skin.color.copy(alpha = 0.25f), RoundedCornerShape(6.dp))
                                    .border(1.dp, skin.color, RoundedCornerShape(6.dp))
                                    .padding(vertical = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "ACTIVE POWER",
                                    color = skin.color,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                        isUnlocked -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF16162A), RoundedCornerShape(6.dp))
                                    .padding(vertical = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "TAP CHOOSE",
                                    color = Color.LightGray,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                        else -> {
                            val canAfford = cumulativeShards >= skin.cost
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (canAfford) Color(0xFFE11D48) else Color(0x1AFFFFFF),
                                        RoundedCornerShape(6.dp)
                                    )
                                    .padding(vertical = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "BUY: ◆ ${skin.cost}",
                                    color = if (canAfford) Color.White else Color.Gray,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Black,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
