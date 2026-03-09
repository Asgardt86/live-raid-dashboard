async function loadRaidTracker(){

  const container = document.getElementById("raid-tracker");

  try{

    const res = await fetch("/api/live-raid");
    const data = await res.json();

    // Kein Raid erkannt
    if(!data.boss || data.totalPulls === 0){

      container.innerHTML = `
        <div class="raid-card">

          <div class="raid-status offline">
            🔴 Aktuell kein Live Raid
          </div>

        </div>
      `;

      return;
    }

    let timelineHTML = "";

    data.timeline.forEach((pull,i)=>{

      const isBest = i === data.timeline.length-1;

      timelineHTML += `
        <div class="pull-row ${isBest ? "best" : ""}">
          Pull ${pull.pull} → ${pull.percent}% ${isBest ? "⭐" : ""}
        </div>
      `;

    });

    const killText = data.kill ? `
      <div class="boss-kill">
        🏆 BOSS DOWN
      </div>
    ` : "";

    container.innerHTML = `

      <div class="raid-card">

        <div class="raid-status live">
          🟢 LIVE RAID
        </div>

        <div class="raid-boss">
          ${data.boss}
        </div>

        ${killText}

        <div class="raid-stats">
          Pulls: ${data.totalPulls}
        </div>

        <div class="raid-stats">
          Best Pull: ${data.bestPull}%
        </div>

        <div class="raid-timeline">
          ${timelineHTML}
        </div>

        <a class="raid-log"
           href="https://www.warcraftlogs.com/reports/${data.report}"
           target="_blank">
           WarcraftLogs öffnen
        </a>

      </div>

    `;

  }catch(e){

    container.innerHTML = `
      <div class="raid-card">
        Fehler beim Laden
      </div>
    `;

  }

}

loadRaidTracker();

// Auto Refresh alle 30 Sekunden
setInterval(loadRaidTracker,30000);
