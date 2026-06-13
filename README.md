# LIFELINE - Minimal Astrology Web

A high-end, minimalist astrology application that generates Bazi, Ziwei Doushu, and Western Astrology charts, and provides AI-driven life path analysis.

## Project Structure

- `src/lib/AstrologyEngine.ts`: Core logic for generating charts using `lunar-javascript` and `astronomy-engine`.
- `src/components/MinimalForm.tsx`: Clean, minimalist input form.
- `src/components/LifePathChart.tsx`: Visualization of life trajectory using `recharts`.
- `src/App.tsx`: Main application logic and UI orchestration.

## Tech Stack

- **Framework**: React + Vite
- **Styling**: Tailwind CSS (Custom "Ink & Paper" theme)
- **Astrology Libraries**: 
    - `lunar-javascript` (Chinese Astrology)
    - `astronomy-engine` (Western Astrology)
- **Visualization**: `recharts`

## Development

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Build for production: `npm run build`

## Deployment

See `DEPLOYMENT_PLAN.md` for a complete guide on taking this project to production.

感谢 @幽素 老师的开源。
