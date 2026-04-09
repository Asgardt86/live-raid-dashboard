async function loadRaidTracker(){

  const container = document.getElementById("raid-tracker");
  const left = document.getElementById("raid-left");
  const right = document.getElementById("raid-right");

  try{

    const res = await fetch("/api/live-raid");
    const data = await res.json();

    /* ========================
       KEIN RAID
    ======================== */

    if(!data.live && !data.summary){

      container.innerHTML = `
        <div class="raid-card">

          <div class="raid-status offline">
            🔴 Aktuell kein Live Raid
          </div>

        </div>
      `;

      left.innerHTML = "";
      right.innerHTML = "";

      return;
    }

    /* ========================
       RAID SUMMARY
    ======================== */

    if(data.summary){

      let summaryHTML = "";

      Object.entries(data.raidStats).forEach(([difficulty,stats]) => {

        summaryHTML += `

          <div class="raid-difficulty">

            <div class="raid-difficulty-title">
              ${difficulty}
            </div>

            <div class="raid-row">
              🏆 Boss Kills: <strong>${stats.kills}</strong>
            </div>

            <div class="raid-row">
              ⚔️ Pulls: <strong>${stats.pulls}</strong>
            </div>

          </div>

        `;

      });

      container.innerHTML = `

        <div class="raid-card">

          <div class="raid-status offline">
            🔴 RAID BEENDET
          </div>

          <div class="raid-raidname">
            ${data.reportTitle || data.raidName || ""}
          </div>

          <div class="raid-stats">
            ⏱ Raid Dauer: ${data.raidDuration}
          </div>

          <div class="raid-summary">
            ${summaryHTML}
          </div>

          <a class="raid-log"
          href="https://www.warcraftlogs.com/reports/${data.report}"
          target="_blank">
          WarcraftLogs öffnen
          </a>

        </div>
      `;

      /* LEFT PANEL */
      left.innerHTML = `
        <h3>Raid Info</h3>
        <div class="side-row">🏰 ${data.raidName || "-"}</div>
        <div class="side-row">⏱ Dauer: ${data.raidDuration}</div>
      `;

      /* RIGHT PANEL */
      right.innerHTML = `
        <h3>Ergebnis</h3>
        <div class="side-row">📊 Raid abgeschlossen</div>
      `;

      return;
    }

    /* ========================
       LIVE RAID
    ======================== */

    let timelineHTML = "";

    if(data.timeline){

      data.timeline.forEach((pull,i)=>{

        const isBest = (i === data.timeline.length-1);

        timelineHTML += `
          <div class="pull-row ${isBest ? "best" : ""}">
            Pull ${pull.pull} → ${pull.percent}% ${isBest ? "⭐" : ""}
          </div>
        `;

      });

    }

    const killText = data.kill ? `
      <div class="boss-kill">
        🏆 BOSS DOWN
      </div>
    ` : "";

    container.innerHTML = `

      <div class="raid-card">

        <div class="raid-status live">
           LIVE RAID
        </div>

        <div class="raid-raidname">
        ${data.reportTitle || data.raidName || ""}
        </div>

        <div class="raid-boss">
          ${data.boss} ${data.difficulty ? "— " + data.difficulty : ""}
        </div>

        ${killText}

        <div class="raid-stats">
          ⏱ Raid läuft seit: ${data.raidDuration}
        </div>

        <div class="raid-stats">
          ⚔️ Pulls: ${data.totalPulls}
        </div>

        <div class="raid-stats">
          🎯 Best Pull: ${data.bestPull}%
        </div>

        <div class="raid-timeline">

          <strong>Progress Timeline</strong>

          ${timelineHTML}

        </div>

        <a class="raid-log"
        href="https://www.warcraftlogs.com/reports/${data.report}"
        target="_blank">

        WarcraftLogs öffnen

        </a>

      </div>

    `;

    /* LEFT PANEL */
    left.innerHTML = `
      <h3>Raid Info</h3>
      <div class="side-row">🏰 ${data.raidName}</div>
      <div class="side-row">👹 ${data.boss}</div>
      <div class="side-row">⚔️ ${data.difficulty}</div>
      <div class="side-row">⏱ ${data.raidDuration}</div>
    `;

    /* RIGHT PANEL */
    right.innerHTML = `
      <h3>Progress</h3>
      <div class="side-row">⚔️ Pulls: ${data.totalPulls}</div>
      <div class="side-row">🎯 Best Try: ${data.bestPull}%</div>

      <div class="progress-bar">
        <div class="progress-fill" style="width:${100 - data.bestPull}%"></div>
      </div>
    `;

  }

  catch(e){

    container.innerHTML = `
      <div class="raid-card">
        Fehler beim Laden
      </div>
    `;

    left.innerHTML = "";
    right.innerHTML = "";

  }

}

loadRaidTracker();

setInterval(loadRaidTracker,30000);
