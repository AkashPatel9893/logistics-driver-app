# GEMINI & ANTIGRAVITY INSTRUCTIONS — ODIN REPORTERS APP

@AGENTS.md

> **CRITICAL DIRECTIVE FOR GEMINI & ANTIGRAVITY:**
> Before proposing any changes, generating any code, or editing any file in this repository, you **MUST** follow the pre-change protocol defined in [AGENTS.md](file:///Users/akash/Desktop/Logistics-app/AGENTS.md) and respect `skills-lock.json`.

---

## Pre-Change Requirements for Gemini / Antigravity

1. **Check Skills & Lockfile (`skills-lock.json`) First:**
   - Locate the applicable domain skill in `.agents/skills/<skill-name>/SKILL.md`.
   - Read the skill in full before taking action.
   - Verify against `skills-lock.json` — all external skills are locked dependencies. Do not tamper with, delete, or introduce unverified skills into `.agents/skills/`.
   - For Odin application components, screens, hooks, or state, read `.agents/skills/odin-component-architecture/SKILL.md`.

2. **Strict Project Constraints (Expo SDK 57):**
   - **Expo SDK 57** (`~57.0.24`), React 19 (`19.2.3`), React Native 0.86 (`0.86.3`), Tailwind CSS v4 (`^4.3.3`) with Uniwind (`^1.12.0`).
   - Never use outdated Expo or legacy React Native patterns. Consult Expo SDK 57 docs: `https://docs.expo.dev/versions/v57.0.0/`.
   - **Package Installations:** Always use `npx expo install <package-name>`, NEVER raw `npm install`, `yarn add`, or `pnpm add`.
   - **Native UI Controls:** Always consult `.agents/skills/expo-ui/SKILL.md`. Use `@expo/ui` native components (SwiftUI / Jetpack Compose) for bottom sheets, pickers, sliders, switches, and menus.
   - **Navigation:** Expo Router (`src/app/`). Consult `.agents/skills/expo-router/SKILL.md`.
   - **Architecture:** Follow `.agents/skills/odin-component-architecture/SKILL.md`. Check for existing components before creating new ones.

3. **Post-Change Verification & Automatic Argent Verification:**
   - Run `npx expo-doctor@latest` if native dependencies or configurations were modified.
   - Verify that changes pass linting (`yarn lint`) and formatting (`yarn format:check`).
   - **Mandatory Automatic Verification with Argent (agy / Antigravity):**
     - Whenever ANY code change is made (especially mobile UI, styling, layout, screens, components, navigation, forms, or app logic), Antigravity **MUST automatically use Argent** to verify changes without waiting for explicit user instructions.
     - **Inspect Devices:** Check available/booted devices (`argent run list-devices`). If a simulator/emulator is booted or available, launch/reload the app (`argent run launch-app` or `argent run debugger-reload-metro`).
     - **Visual & Structural Validation:** Capture and inspect the UI using `argent run screenshot` and `argent run describe` (or `mcp__argent__*` tools) to ensure there are no layout shifts, clipping, text overflow, or UI breaks.
     - **Interaction & Flow Testing:** If modifying buttons, navigation, modals, or inputs, interact with the UI (`argent run gesture-tap`, `argent run keyboard`, `argent run run-sequence`) to verify behavior end-to-end.
     - **Logs & Diagnostics:** Check JS runtime logs (`argent run debugger-log-registry`) to ensure no unhandled exceptions, console warnings, or crashes occurred.
