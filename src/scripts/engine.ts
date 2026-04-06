export interface KingdomState {
  year: number;
  season: number;
  population: number;
  storedRice: number;
}

export interface TurnOrders {
  dykeWorkers: number;
  fieldWorkers: number;
  villageGuards: number;
  riceToPlant: number;
}

function renderMap(state: KingdomState) {
  try {
    // Safety Check: Only draw if the DOM is actually ready and visible
    if (typeof document === 'undefined') return;
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    // Force strict numbers to prevent emoji math from crashing
    const popCount = Math.max(0, Math.ceil(Number(state.population) / 20) || 0);
    const riceCount = Math.max(0, Math.ceil(Number(state.storedRice) / 500) || 0);

    const peasants = "🧑‍🌾".repeat(popCount);
    const rice = "🌾".repeat(riceCount);
    const river = "🟦🟦🟦🟦🟦🟦🟦🟦🟦🟦";

    mapContainer.innerHTML = `
      <div><strong>Year: ${state.year} | Season: ${state.season}</strong></div>
      <div style="margin: 20px 0;">${river}</div>
      <div><strong>Villagers:</strong><br/> ${peasants || "💀 (Ghost Town)"}</div>
      <div style="margin: 10px 0;"><strong>Granary:</strong><br/> ${rice || "Empty!"}</div>
      <div class="stats">Population: ${state.population} | Stored Rice: ${state.storedRice}</div>
    `;
  } catch (e) {
    console.error("Map render skipped in background worker.");
  }
}

export function processSeason(state: KingdomState, orders: TurnOrders): { state: KingdomState, turnReport: string } {
  // 1. GRACEFUL VALIDATION (No more crashing!)
  const totalWorkers = Number(orders.dykeWorkers) + Number(orders.fieldWorkers) + Number(orders.villageGuards);
  
  if (totalWorkers > state.population) {
    return {
      state: state, // Return unchanged state
      turnReport: `INVALID ORDERS: My Emperor, you ordered ${totalWorkers} peasants to work, but we only have ${state.population}! Please issue new orders.`
    };
  }
  
  if (orders.riceToPlant > state.storedRice) {
     return {
      state: state,
      turnReport: `INVALID ORDERS: My Emperor, you commanded us to plant ${orders.riceToPlant} rice, but we only have ${state.storedRice} in the granary! Please issue new orders.`
    };
  }

  let turnReport = "";
  const updatedState = { ...state };

  // 2. Starvation Math
  const requiredRice = updatedState.population * 20;
  let starved = 0;

  if (updatedState.storedRice >= requiredRice) {
    updatedState.storedRice -= requiredRice;
  } else {
    const deficit = requiredRice - updatedState.storedRice;
    starved = Math.ceil(deficit / 20);
    updatedState.population -= starved;
    updatedState.storedRice = 0;
  }

  if (starved > 0) {
    turnReport += `${starved} peasants starved to death! `;
  } else {
    turnReport += `The village is well-fed. `;
  }

  // 3. Harvest Math
  if (updatedState.season === 2) {
    let baseYield = orders.riceToPlant * 3;
    let maxYield = orders.fieldWorkers * 50;
    let finalYield = Math.min(baseYield, maxYield);
    updatedState.storedRice += finalYield;
    turnReport += `The harvest yielded ${finalYield} sacks of rice. `;
  }

  // 4. Advance Time
  updatedState.season++;
  if (updatedState.season > 3) {
    updatedState.season = 1;
    updatedState.year++;
  }

  const upcomingSeasonName = updatedState.season === 1 ? "Growing" : updatedState.season === 2 ? "Harvest" : "Winter";
  turnReport += `The upcoming season is ${updatedState.season} (${upcomingSeasonName}).`;

  // 5. Safely attempt to draw the map
  renderMap(updatedState);

  return { state: updatedState, turnReport: turnReport.trim() };
}
