# Image credits

Home page category card background photos, sourced from [Pixabay](https://pixabay.com)
(Pixabay Content License — free for commercial use, no attribution legally required; credited
here anyway for provenance/traceability if these ever need to be swapped or re-downloaded).

| File | Category | Source |
|---|---|---|
| `daily.jpg` | 일상 | https://pixabay.com/photos/coffee-cup-relaxation-window-791958/ |
| `info.jpg` | 정보 | https://pixabay.com/photos/circuit-board-electronics-computer-973311/ |
| `art.jpg` | 예술 | https://pixabay.com/photos/exhibition-museum-painting-art-362163/ |
| `quote.jpg` | 글귀 | https://pixabay.com/photos/paper-texture-background-old-1332008/ |

Each is overlaid with a semi-transparent wash (matching the card's own base color) in
`src/app/page.tsx` so text stays legible — see the `bg-[...]/[opacity]` div on top of each `Image`.
