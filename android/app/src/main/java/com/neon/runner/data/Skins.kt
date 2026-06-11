package com.neon.runner.data

import androidx.compose.ui.graphics.Color

enum class TrailType {
    SMOOTH,
    SMOKE,
    SPARKLES,
    RAINBOW
}

data class Skin(
    val id: String,
    val name: String,
    val color: Color,
    val secondaryColor: Color,
    val glowColor: Color,
    val cost: Int,
    val trailType: TrailType,
    val description: String
)

val SKINS = listOf(
    Skin(
        id = "cyan_dynamo",
        name = "Cyan Dynamo",
        color = Color(0xFF00FFFF),
        secondaryColor = Color(0xFF008B8B),
        glowColor = Color(0xCC00FFFF),
        cost = 0,
        trailType = TrailType.SMOOTH,
        description = "The standard issue cybernetic pulse. Smooth and reliable."
    ),
    Skin(
        id = "orchid_surge",
        name = "Orchid Surge",
        color = Color(0xFFFF007F),
        secondaryColor = Color(0xFFC71585),
        glowColor = Color(0xCCFF007F),
        cost = 15,
        trailType = TrailType.SMOKE,
        description = "An aggressive, high-pressure pink shockwave. Sizzles in motion."
    ),
    Skin(
        id = "acid_overload",
        name = "Acid Overload",
        color = Color(0xFF39FF14),
        secondaryColor = Color(0xFF006400),
        glowColor = Color(0xCC39FF14),
        cost = 30,
        trailType = TrailType.SPARKLES,
        description = "Highly volatile bio-luminescent neon sludge. Drops toxic sparks."
    ),
    Skin(
        id = "solar_flare",
        name = "Solar Flare",
        color = Color(0xFFFFAA00),
        secondaryColor = Color(0xFFD2691E),
        glowColor = Color(0xCCFFAA00),
        cost = 50,
        trailType = TrailType.SMOOTH,
        description = "Harvested directly from thermonuclear solar winds. Elite heat."
    ),
    Skin(
        id = "chroma_spectrum",
        name = "Chroma Horizon",
        color = Color(0xFFFF00FF), // cycles dynamically or stands alone
        secondaryColor = Color(0xFF00FFFF),
        glowColor = Color(0xE6FFFFFF),
        cost = 100,
        trailType = TrailType.RAINBOW,
        description = "A legendary masterwork that bends the full visible light spectrum."
    )
)
