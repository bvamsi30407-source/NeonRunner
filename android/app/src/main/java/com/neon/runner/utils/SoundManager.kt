package com.neon.runner.utils

import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.media.SoundPool
import android.os.Build
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import kotlin.concurrent.thread
import kotlin.math.sin

/**
 * High-performance native audio synthesizer for retro-arcade sound effects in Kotlin.
 * Dynamically generates PCM wave data on startup to avoid relying on external resources,
 * then maps synthesized byte bytes into Android's low-latency SoundPool system.
 */
class SoundManager(private val context: Context) {

    private var soundPool: SoundPool? = null
    private val soundMap = HashMap<String, Int>()
    
    var isMuted = false

    init {
        // Build the optimized SoundPool instance
        soundPool = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val attributes = android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_GAME)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            SoundPool.Builder()
                .setMaxStreams(5)
                .setAudioAttributes(attributes)
                .build()
        } else {
            @Suppress("DEPRECATION")
            SoundPool(5, AudioManager.STREAM_MUSIC, 0)
        }

        // Generate synthetic wav assets in background thread to keep startup immediate
        thread(start = true) {
            try {
                synthesizeAllSounds()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun synthesizeAllSounds() {
        val sampleRate = 44100

        // 1. Jump Sound (Sweep Up)
        val jumpBytes = generateSynthSweep(sampleRate, 200f, 650f, 0.15f, isSquare = false)
        val jumpFile = saveToCache(context, "jump_synth.wav", jumpBytes, sampleRate)
        soundMap["jump"] = soundPool?.load(jumpFile.absolutePath, 1) ?: 0

        // 2. Collect Shard (Chime Chord)
        val collectBytes = generateDoubleChime(sampleRate, 880f, 1320f, 0.2f)
        val collectFile = saveToCache(context, "collect_synth.wav", collectBytes, sampleRate)
        soundMap["collect"] = soundPool?.load(collectFile.absolutePath, 1) ?: 0

        // 3. Crash (Noise Explosion)
        val crashBytes = generateSynthNoiseExplosion(sampleRate, 0.35f)
        val crashFile = saveToCache(context, "crash_synth.wav", crashBytes, sampleRate)
        soundMap["crash"] = soundPool?.load(crashFile.absolutePath, 1) ?: 0

        // 4. Buy / Unlocked Trigger (Double High Chime)
        val buyBytes = generateDoubleChime(sampleRate, 600f, 1200f, 0.25f)
        val buyFile = saveToCache(context, "buy_synth.wav", buyBytes, sampleRate)
        soundMap["buy"] = soundPool?.load(buyFile.absolutePath, 1) ?: 0
    }

    private fun generateSynthSweep(
        sampleRate: Int,
        startFreq: Float,
        endFreq: Float,
        duration: Float,
        isSquare: Boolean = false
    ): ShortArray {
        val numSamples = (sampleRate * duration).toInt()
        val samples = ShortArray(numSamples)
        for (i in 0 until numSamples) {
            val t = i.toFloat() / sampleRate
            val progress = i.toFloat() / numSamples
            val freq = startFreq + (endFreq - startFreq) * progress
            val angle = 2.0 * Math.PI * freq * t
            val value = if (isSquare) {
                if (sin(angle) >= 0) 0.5f else -0.5f
            } else {
                sin(angle).toFloat()
            }
            
            // Linear fade out envelope to eliminate audio clicks
            val envelope = if (progress > 0.8f) (1f - progress) / 0.2f else 1.0f
            samples[i] = (value * 32767 * 0.4f * envelope).toInt().toShort()
        }
        return samples
    }

    private fun generateDoubleChime(
        sampleRate: Int,
        f1: Float,
        f2: Float,
        duration: Float
    ): ShortArray {
        val numSamples = (sampleRate * duration).toInt()
        val samples = ShortArray(numSamples)
        val halfPoint = numSamples / 2

        for (i in 0 until numSamples) {
            val t = i.toFloat() / sampleRate
            val progress = i.toFloat() / numSamples
            
            // Play lower note, blending in the second higher note
            val angle1 = 2.0 * Math.PI * f1 * t
            val angle2 = 2.0 * Math.PI * f2 * t
            
            val value = if (i < halfPoint) {
                sin(angle1).toFloat() * 0.5f
            } else {
                (sin(angle1).toFloat() * 0.3f + sin(angle2).toFloat() * 0.5f)
            }

            // Exponential fade out envelope
            val envelope = Math.exp(-progress * 5.0).toFloat()
            samples[i] = (value * 32767 * 0.4f * envelope).toInt().toShort()
        }
        return samples
    }

    private fun generateSynthNoiseExplosion(sampleRate: Int, duration: Float): ShortArray {
        val numSamples = (sampleRate * duration).toInt()
        val samples = ShortArray(numSamples)
        var lastRandom = 0.0f

        for (i in 0 until numSamples) {
            val progress = i.toFloat() / numSamples
            
            // Generate white noise blended with low frequency sweep rumbling
            val noise = (Math.random() * 2.0 - 1.0).toFloat()
            // Low pass logic filter
            lastRandom = 0.85f * lastRandom + 0.15f * noise
            
            val angle = 2.0 * Math.PI * (100f * (1f - progress)) * (i.toFloat() / sampleRate)
            val rumble = sin(angle).toFloat()

            val value = (lastRandom * 0.6f + rumble * 0.4f)
            val envelope = (1.0f - progress) * (1.0f - progress)
            samples[i] = (value * 32767 * 0.5f * envelope).toInt().toShort()
        }
        return samples
    }

    private fun saveToCache(
        context: Context,
        filename: String,
        shortArray: ShortArray,
        sampleRate: Int
    ): File {
        val file = File(context.cacheDir, filename)
        val byteData = ByteArray(shortArray.size * 2)
        for (i in shortArray.indices) {
            val shortVal = shortArray[i].toInt()
            byteData[i * 2] = (shortVal and 0xff).toByte()
            byteData[i * 2 + 1] = ((shortVal shr 8) and 0xff).toByte()
        }
        
        val totalAudioLen = byteData.size.toLong()
        val totalDataLen = totalAudioLen + 36
        val byteRate = (sampleRate * 2 * 1).toLong() // 1 channel, 16 bps

        val header = ByteArray(44)
        header[0] = 'R'.toByte() // RIFF
        header[1] = 'I'.toByte()
        header[2] = 'F'.toByte()
        header[3] = 'F'.toByte()
        header[4] = (totalDataLen and 0xff).toByte()
        header[5] = ((totalDataLen shr 8) and 0xff).toByte()
        header[6] = ((totalDataLen shr 16) and 0xff).toByte()
        header[7] = ((totalDataLen shr 24) and 0xff).toByte()
        header[8] = 'W'.toByte() // WAVE
        header[9] = 'A'.toByte()
        header[10] = 'V'.toByte()
        header[11] = 'E'.toByte()
        header[12] = 'f'.toByte() // fmt chunk
        header[13] = 'm'.toByte()
        header[14] = 't'.toByte()
        header[15] = ' '.toByte()
        header[16] = 16 // 16-bit format chunk size
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1 // Format: uncompressed PCM
        header[21] = 0
        header[22] = 1 // Channels: Mono
        header[23] = 0
        header[24] = (sampleRate.toLong() and 0xff).toByte()
        header[25] = ((sampleRate.toLong() shr 8) and 0xff).toByte()
        header[26] = ((sampleRate.toLong() shr 16) and 0xff).toByte()
        header[27] = ((sampleRate.toLong() shr 24) and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte()
        header[31] = ((byteRate shr 24) and 0xff).toByte()
        header[32] = 2 // Block align: 1 channel, 2 bytes/sample
        header[33] = 0
        header[34] = 16 // Bits per sample
        header[35] = 0
        header[36] = 'd'.toByte() // data chunk
        header[37] = 'a'.toByte()
        header[38] = 't'.toByte()
        header[39] = 'a'.toByte()
        header[40] = (totalAudioLen and 0xff).toByte()
        header[41] = ((totalAudioLen shr 8) and 0xff).toByte()
        header[42] = ((totalAudioLen shr 16) and 0xff).toByte()
        header[43] = ((totalAudioLen shr 24) and 0xff).toByte()

        val outputStream = FileOutputStream(file)
        outputStream.write(header)
        outputStream.write(byteData)
        outputStream.close()
        return file
    }

    fun playJump() {
        if (isMuted) return
        val soundId = soundMap["jump"] ?: 0
        if (soundId != 0) soundPool?.play(soundId, 0.7f, 0.7f, 1, 0, 1.0f)
    }

    fun playCollect() {
        if (isMuted) return
        val soundId = soundMap["collect"] ?: 0
        if (soundId != 0) soundPool?.play(soundId, 0.8f, 0.8f, 1, 0, 1.0f)
    }

    fun playCrash() {
        if (isMuted) return
        val soundId = soundMap["crash"] ?: 0
        if (soundId != 0) soundPool?.play(soundId, 0.9f, 0.9f, 1, 0, 1.0f)
    }

    fun playBuy() {
        if (isMuted) return
        val soundId = soundMap["buy"] ?: 0
        if (soundId != 0) soundPool?.play(soundId, 0.8f, 0.8f, 1, 0, 1.0f)
    }

    fun release() {
        soundPool?.release()
        soundPool = null
    }
}
