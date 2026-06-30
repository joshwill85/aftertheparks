import type { AboutIconName, StoryArtifact } from "../content";
import styles from "../about.module.css";

interface AboutIconProps {
  name: AboutIconName;
}

export function AboutIcon({ name }: AboutIconProps) {
  switch (name) {
    case "sun-pack":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <circle cx="15" cy="14" r="6" />
          <path d="M15 3v4M15 21v4M4 14h4M22 14h4M8 7l3 3M22 7l-3 3" />
          <path d="M22 40V24h14l4 16z" />
          <path d="M25 24v-5h8v5M26 31h10" />
        </svg>
      );
    case "cabin-key":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <path d="M8 24 24 12l16 12v16H8z" />
          <path d="M16 40V28h10v12M9 24h30M14 20h20" />
          <circle cx="36" cy="12" r="4" />
          <path d="M39 15l5 5M42 18l-2 2" />
        </svg>
      );
    case "paper-stack":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <path d="M13 9h22v28H13z" />
          <path d="M9 13h22v28M18 17h12M18 23h12M18 29h8" />
          <path d="M34 9v8h-8" />
        </svg>
      );
    case "pencil-dots":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <path d="M10 36 31 15l6 6-21 21H10z" />
          <path d="m28 18 6 6M12 34l4 4" />
          <circle cx="11" cy="12" r="2" />
          <circle cx="21" cy="9" r="2" />
          <circle cx="35" cy="34" r="2" />
          <path d="M13 12c8 4 14 12 22 22" />
        </svg>
      );
    case "route-sign":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <path d="M24 42V10" />
          <path d="M12 10h25l-5 6 5 6H12z" />
          <path d="M11 26h26l-5 6 5 6H11z" />
          <circle cx="24" cy="42" r="3" />
        </svg>
      );
    case "lantern-path":
      return (
        <svg viewBox="0 0 48 48" aria-hidden className={styles.storyIconSvg}>
          <path d="M18 16h12l3 22H15z" />
          <path d="M20 16c0-5 8-5 8 0M18 23h12" />
          <circle cx="24" cy="30" r="4" />
          <path d="M7 42c8-5 14-5 22 0 4 2 8 2 12 0" />
        </svg>
      );
  }
}

interface AboutMotifSetProps {
  artifact: StoryArtifact;
}

export function AboutMotifSet({ artifact }: AboutMotifSetProps) {
  return (
    <svg
      viewBox="0 0 260 92"
      aria-hidden
      className={styles.storyMotifSvg}
      data-motif-set={artifact}
    >
      {artifact === "summer" && (
        <>
          <g data-motif="summer-sun">
            <circle className={styles.motifGlow} cx="30" cy="28" r="18" />
            <circle className={styles.motifGold} cx="30" cy="28" r="9" />
            <path className={styles.motifLineGold} d="M30 6v8M30 42v8M8 28h8M44 28h8M15 13l6 6M45 13l-6 6" />
          </g>
          <g data-motif="kid-pack">
            <path className={styles.motifFillBlue} d="M80 30h36l7 44H73z" />
            <path className={styles.motifLineInk} d="M84 30c1-17 31-17 32 0M76 50h44M87 63h18M73 74h50" />
          </g>
          <g data-motif="vpk-paper-shape">
            <path className={styles.motifPaper} d="M164 17h48l12 12v48h-60z" />
            <path className={styles.motifLineInk} d="M212 17v14h12M176 38h24M176 50h34M176 62h22" />
            <circle className={styles.motifCoral} cx="211" cy="61" r="6" />
            <path className={styles.motifLineGold} d="M210 54v14M203 61h15" />
          </g>
        </>
      )}

      {artifact === "cabin" && (
        <>
          <g data-motif="cabin-key-tag">
            <path className={styles.motifPaper} d="M18 32c0-13 20-13 20 0 0 12-10 24-10 24S18 44 18 32z" />
            <circle className={styles.motifLineInk} cx="28" cy="32" r="4" />
            <path className={styles.motifLineInk} d="M28 56l24 24M44 72l-8 8M52 80l-8 8" />
          </g>
          <g data-motif="pine-tree">
            <path className={styles.motifFillGreen} d="M88 10 106 42h-9l15 25H76l15-25h-9z" />
            <path className={styles.motifLineInk} d="M94 67v16" />
          </g>
          <g data-motif="split-receipt">
            <path className={styles.motifPaper} d="M136 14h50v62l-7-5-7 5-7-5-7 5-7-5-8 5z" />
            <path className={styles.motifLineInk} d="M148 30h26M148 43h26M161 25v39" />
            <circle className={styles.motifGold} cx="153" cy="60" r="4" />
            <circle className={styles.motifBlue} cx="171" cy="60" r="4" />
          </g>
          <g data-motif="calendar-circle">
            <path className={styles.motifPaper} d="M210 22h34v34h-34z" />
            <path className={styles.motifLineInk} d="M210 33h34M219 18v9M235 18v9M220 43h14" />
            <circle className={styles.motifLineGold} cx="227" cy="45" r="15" />
          </g>
        </>
      )}

      {artifact === "problem" && (
        <>
          <g data-motif="pdf-stack">
            <path className={styles.motifPaper} d="M18 24h36v48H18z" />
            <path className={styles.motifPaperSoft} d="M27 15h36v48" />
            <path className={styles.motifLineInk} d="M28 38h18M28 50h17M28 62h13" />
          </g>
          <g data-motif="phone-screen">
            <rect className={styles.motifFillBlue} x="82" y="16" width="33" height="62" rx="8" />
            <path className={styles.motifLineInk} d="M92 25h13M94 68h9" />
            <circle className={styles.motifGold} cx="99" cy="46" r="8" />
          </g>
          <g data-motif="image-thumb">
            <path className={styles.motifPaper} d="M138 25h42v38h-42z" />
            <circle className={styles.motifCoral} cx="151" cy="38" r="5" />
            <path className={styles.motifLineInk} d="M141 61l14-15 9 8 8-11 8 18" />
          </g>
          <g data-motif="calendar-grid">
            <path className={styles.motifPaper} d="M202 18h38v42h-38z" />
            <path className={styles.motifLineInk} d="M202 30h38M215 18v42M228 18v42M202 44h38" />
          </g>
          <g data-motif="question-cues">
            <path className={styles.motifLineCoral} d="M70 35c0-8 13-9 13 0 0 8-9 7-9 15" />
            <circle className={styles.motifCoral} cx="74" cy="62" r="3" />
            <path className={styles.motifLineGold} d="M235 65c0-7 11-8 11 0 0 7-8 6-8 13" />
            <circle className={styles.motifGold} cx="238" cy="86" r="2.5" />
          </g>
        </>
      )}

      {artifact === "builder" && (
        <>
          <g data-motif="pencil">
            <path className={styles.motifFillGold} d="M18 66 75 9l13 13-57 57H18z" />
            <path className={styles.motifLineInk} d="M71 13l13 13M25 61l11 11M18 79l13-4" />
          </g>
          <g data-motif="data-dots">
            <circle className={styles.motifBlue} cx="114" cy="28" r="6" />
            <circle className={styles.motifGold} cx="139" cy="48" r="6" />
            <circle className={styles.motifCoral} cx="166" cy="25" r="6" />
            <path className={styles.motifLineInk} d="M114 28l25 20 27-23" />
          </g>
          <g data-motif="spreadsheet-route">
            <path className={styles.motifPaper} d="M190 18h48v48h-48z" />
            <path className={styles.motifLineSoft} d="M190 34h48M190 50h48M206 18v48M222 18v48" />
            <path className={styles.motifLineGold} d="M194 62c14-20 28 0 42-20" />
            <circle className={styles.motifGold} cx="194" cy="62" r="3" />
            <circle className={styles.motifGold} cx="236" cy="42" r="3" />
          </g>
        </>
      )}

      {artifact === "born" && (
        <>
          <g data-motif="signpost">
            <path className={styles.motifLineInk} d="M34 80V14" />
            <path className={styles.motifPaper} d="M12 15h55l-10 11 10 11H12z" />
            <path className={styles.motifPaperSoft} d="M9 42h56L55 53l10 11H9z" />
          </g>
          <g data-motif="map-pin">
            <path className={styles.motifFillCoral} d="M99 28c0-19 29-19 29 0 0 16-14 32-14 32S99 44 99 28z" />
            <circle className={styles.motifPaperDot} cx="114" cy="29" r="6" />
          </g>
          <g data-motif="name-note">
            <path className={styles.motifPaper} d="M153 18h46l9 10v42h-55z" />
            <path className={styles.motifLineInk} d="M199 18v11h9M164 38h29M164 50h20" />
            <path className={styles.motifLineGold} d="M194 54l3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" />
          </g>
          <g data-motif="activity-cards">
            <path className={styles.motifPaperSoft} d="M218 24h28v18h-28zM214 49h33v19h-33z" />
            <path className={styles.motifLineInk} d="M223 33h14M221 58h17" />
            <circle className={styles.motifBlue} cx="242" cy="58" r="3" />
          </g>
        </>
      )}

      {artifact === "twilight" && (
        <>
          <g data-motif="lantern">
            <path className={styles.motifFillGold} d="M22 27h30l6 46H16z" />
            <path className={styles.motifLineInk} d="M25 27c0-14 24-14 24 0M22 43h30" />
            <circle className={styles.motifPaperDot} cx="37" cy="55" r="8" />
          </g>
          <g data-motif="twilight-path">
            <path className={styles.motifLineBlue} d="M80 72c26-21 47 17 76-8 18-15 31-18 47-13" />
            <circle className={styles.motifBlue} cx="91" cy="66" r="4" />
            <circle className={styles.motifGold} cx="151" cy="64" r="4" />
          </g>
          <g data-motif="pass-card-shape">
            <rect className={styles.motifPaper} x="101" y="18" width="53" height="32" rx="8" />
            <path className={styles.motifLineInk} d="M110 29h18M110 39h31" />
            <circle className={styles.motifCoral} cx="141" cy="31" r="5" />
          </g>
          <g data-motif="campfire-glow">
            <circle className={styles.motifGlow} cx="219" cy="54" r="26" />
            <path className={styles.motifLineInk} d="M197 75h43M204 81h32" />
            <path className={styles.motifFillCoral} d="M218 60c-11-12 8-18 1-35 20 16 24 30 7 43-3 2-6 1-8-8z" />
            <path className={styles.motifFillGold} d="M224 63c-7-8 4-13 2-22 10 10 12 17 4 26-2 1-4 1-6-4z" />
          </g>
        </>
      )}
    </svg>
  );
}

export function HeroMapScene() {
  return (
    <div className={styles.heroScene} role="img" aria-label="Illustrated resort planning map with a cabin, campfire, backpack, and route marks.">
      <div className={styles.heroSky} aria-hidden />
      <svg viewBox="0 0 520 380" className={styles.heroSvg} aria-hidden>
        <path className={styles.mapPaper} d="M74 246 205 202l112 32 129-42v118l-126 46-113-33-133 43z" />
        <path className={styles.mapFold} d="M205 202v121M317 234v122" />
        <path className={styles.mapRoute} d="M104 305c45-46 88-8 121-46 39-45 76 27 122-18 22-21 45-29 72-24" />
        <circle className={styles.routeDot} cx="118" cy="294" r="8" />
        <circle className={styles.routeDot} cx="250" cy="250" r="8" />
        <circle className={styles.routeDot} cx="399" cy="219" r="8" />
        <path className={styles.walkPath} d="M382 116c28 9 48 27 62 53M80 126c20-15 44-19 70-13" />

        <path className={styles.cabinRoof} d="M96 158 159 111l64 47z" />
        <path className={styles.cabinBody} d="M112 158h94v74h-94z" />
        <path className={styles.cabinLine} d="M126 173h66M126 190h66M148 232v-38h25v38" />
        <path className={styles.tree} d="M242 132 261 92l18 40h-9l15 31h-48l15-31z" />
        <path className={styles.treeTrunk} d="M258 162v32" />
        <path className={styles.palmTrunk} d="M322 181v-54" />
        <path className={styles.palmLeaf} d="M322 128c-25-18-46-10-62 8M325 128c26-24 52-14 66 0M322 128c2-28 22-42 48-42" />

        <path className={styles.picnic} d="M286 172h88M300 172l-24 44M360 172l24 44M296 203h82" />
        <path className={styles.mapNoteSlip} d="M124 248h80l-8 42h-78z" />
        <text className={styles.mapNoteText} x="134" y="274">Tonight?</text>
        <path className={styles.backpack} d="M405 250h38v54h-38z" />
        <path className={styles.backpack} d="M413 250c0-16 22-16 22 0M405 274h38M412 286h12" />
        <path className={styles.schedule} d="M352 266h48v48h-48zM362 282h26M362 296h18" />
        <path className={styles.pinToday} d="M388 102c0-12 18-12 18 0 0 10-9 18-9 18s-9-8-9-18z" />
        <path className={styles.pinTonight} d="M430 134c0-12 18-12 18 0 0 10-9 18-9 18s-9-8-9-18z" />
        <path className={styles.lanternMini} d="M78 218h26l5 48H73zM83 218c0-10 16-10 16 0M82 235h20" />
        <circle className={styles.firefly} cx="342" cy="102" r="4" />
        <circle className={styles.firefly} cx="453" cy="184" r="3" />
        <circle className={styles.firefly} cx="73" cy="184" r="3" />

        <path className={styles.fireLog} d="M259 290h58M268 306h48" />
        <path className={styles.flame} d="M289 282c-15-16 12-25 1-48 28 24 34 41 10 60-4 3-8 2-11-12z" />
        <path className={styles.flameInner} d="M295 286c-9-11 6-18 3-31 14 14 16 24 5 36-3 2-6 1-8-5z" />
      </svg>
    </div>
  );
}

export function ObjectDetailIllustration() {
  return (
    <svg viewBox="0 0 220 160" aria-hidden className={styles.objectDetailSvg}>
      <circle className={styles.coffeeRing} cx="54" cy="116" r="20" />
      <path className={styles.scheduleSheet} d="M143 34h44v58h-44zM153 50h22M153 66h28M153 82h18" />
      <path className={styles.cabinKeyTag} d="M166 112c0-9 14-9 14 0s-7 15-7 15-7-6-7-15zM173 127l18 18M185 139l-5 5" />
      <path d="M24 42 93 24l62 20 42-12v86l-46 14-61-20-66 18z" />
      <path d="M93 24v88M155 44v88" />
      <path d="M42 103c30-31 57-3 79-28 25-28 43 12 72-17" />
      <path d="M41 50h46M41 67h34M113 54h26M113 69h22" />
      <circle cx="66" cy="100" r="5" />
      <circle cx="121" cy="75" r="5" />
      <circle cx="178" cy="59" r="5" />
      <path d="M159 31c0-11 17-11 17 0 0 9-9 17-9 17s-8-8-8-17z" />
      <path d="M43 139h84" />
      <path d="M125 137 159 103l9 9-34 34h-12z" />
    </svg>
  );
}
