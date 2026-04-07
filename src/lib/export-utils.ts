'use client';

/**
 * Handles the complex Excel generation and download trigger.
 * Dynamically imports 'xlsx' to keep main bundles light.
 */
export async function downloadExcelReport({
  plant,
  finalRatios,
  refinement,
  fabL10Height,
  cupL10Height,
  floodHeight,
  fabLoss,
  cupLoss,
  totalLoss,
  assetDistribution,
  ratios
}: any) {
  if (!plant || !finalRatios) return;

  // Dynamically import xlsx
  const XLSX = await import('xlsx');
  
  const wsData: any[][] = [];
  
  // 1. Header
  wsData.push([`M-FLEM Pro Integrated Report - ${plant.company} ${plant.plantName}`]);
  wsData.push([`Generated on: ${new Date().toLocaleString()}`]);
  wsData.push([]);

  // 2. Step 2 & 3: Organization & Plant Configuration
  wsData.push(['--- Organization & Plant Configuration ---']);
  wsData.push(['Field', 'Value']);
  wsData.push(['Company', plant.company]);
  wsData.push(['Site/Plant Name', plant.plantName]);
  wsData.push(['Coordinates (Lat/Lon)', `${plant.lat}, ${plant.lon}`]);
  wsData.push(['Bi12m Initial Value (M NTD)', plant.bi12m]);
  wsData.push([]);
  wsData.push(['Initial Asset Values (M NTD)']);
  wsData.push(['Building', 'Facility', 'Tools', 'Fixture', 'Stock']);
  wsData.push([plant.pdBuilding, plant.pdFacility, plant.pdTools, plant.pdFixture, plant.pdStock]);
  wsData.push([]);

  // 3. Step 4: Spatial Value Distribution (if available)
  if (refinement) {
    wsData.push(['--- Spatial Value Distribution (Step 4) ---']);
    wsData.push(['Global Facility/Cleanroom Ratio', refinement.facCrRatio]);
    wsData.push(['Global Tools Ratio', refinement.toolsCrRatio]);
    wsData.push([]);
    wsData.push(['Floor Identifier', 'Facility % (0-1)', 'Cleanroom % (0-1)']);
    Object.entries(refinement.floorData || {}).forEach(([floor, data]: [string, any]) => {
      wsData.push([floor, data.fac, data.cr]);
    });
    wsData.push([]);
  }

  // 4. Step 5: Financial Asset Distribution Matrix
  wsData.push(['--- Financial Asset Distribution Matrix (Step 5) ---']);
  wsData.push(['Floor Identifier', 'Building Ratio', 'Facility Ratio', 'Tools Ratio', 'Fixture Ratio', 'Stock Ratio']);
  Object.entries(finalRatios).forEach(([floor, rats]: [string, any]) => {
    wsData.push([floor, rats.bldg, rats.fac, rats.tool, rats.fix, rats.stock]);
  });
  wsData.push([]);

  // 5. Step 6: Risk Estimation Profile
  wsData.push(['--- Risk Estimation Profile (STEP6 Overview) ---']);
  wsData.push(['Metric', 'Value']);
  wsData.push(['FAB L10 Height (m)', fabL10Height]);
  wsData.push(['CUP L10 Height (m)', cupL10Height]);
  wsData.push(['Flood Height AGL (m)', floodHeight]);
  wsData.push(['Cumulative FAB Financial Impact (M NTD)', fabLoss]);
  wsData.push(['Cumulative CUP Financial Impact (M NTD)', cupLoss]);
  wsData.push(['Total Cumulative Site Impact (M NTD)', totalLoss]);
  wsData.push([]);

  // 6. Detailed Analysis Tables (if distribution calculated)
  if (assetDistribution) {
    wsData.push(['--- FAB Building Loss Analysis Detail ---']);
    wsData.push(['Level', 'Metric', 'Building', 'Tools', 'Facility', 'Fixture', 'Stock']);
    
    const fabLevels = [
      { name: 'Basement', dist: assetDistribution.fabBs, suffix: 'Bs' },
      { name: 'L10 Level', dist: assetDistribution.fabL10Floor, suffix: 'L10' }
    ];
    
    fabLevels.forEach(level => {
      ['VALUE', 'LOSS'].forEach(metric => {
        const row: (string | number)[] = [level.name, metric];
        const keys = ['bldg', 'tool', 'fac', 'fix', 'stock'];
        keys.forEach(key => {
          const baseVal = (key === 'bldg' ? plant.pdBuilding : key === 'tool' ? plant.pdTools : key === 'fac' ? plant.pdFacility : key === 'fix' ? plant.pdFixture : plant.pdStock) * (level.dist as any)[`${key}Ratio`];
          if (metric === 'VALUE') {
            row.push(Number(baseVal.toFixed(2)));
          } else {
            // Mapping to ratios key, e.g., fabBldgBs
            const ratioKeyPrefix = 'fab';
            const ratioKeyMid = key.charAt(0).toUpperCase() + key.slice(1);
            const ratioKey = `${ratioKeyPrefix}${ratioKeyMid}${level.suffix}`;
            const lossRatio = ratios?.[ratioKey] ?? 0;
            const lossVal = baseVal * (lossRatio / 100);
            row.push(Number(lossVal.toFixed(2)));
          }
        });
        wsData.push(row);
      });
    });
    wsData.push([]);

    wsData.push(['--- CUP Building Loss Analysis Detail ---']);
    wsData.push(['Level', 'Metric', 'Building', 'Facility']);
    const cupLevels = [
      { name: 'Basement', dist: assetDistribution.cupBs, suffix: 'Bs' },
      { name: 'L10 Level', dist: assetDistribution.cupL10Floor, suffix: 'L10' }
    ];
    cupLevels.forEach(level => {
      ['VALUE', 'LOSS'].forEach(metric => {
        const row: (string | number)[] = [level.name, metric];
        ['bldg', 'fac'].forEach(key => {
          const baseVal = (key === 'bldg' ? plant.pdBuilding : plant.pdFacility) * (level.dist as any)[`${key}Ratio`];
          if (metric === 'VALUE') {
            row.push(Number(baseVal.toFixed(2)));
          } else {
            const ratioKeyPrefix = 'cup';
            const ratioKeyMid = key.charAt(0).toUpperCase() + key.slice(1);
            const ratioKey = `${ratioKeyPrefix}${ratioKeyMid}${level.suffix}`;
            const lossRatio = ratios?.[ratioKey] ?? 0;
            const lossVal = baseVal * (lossRatio / 100);
            row.push(Number(lossVal.toFixed(2)));
          }
        });
        wsData.push(row);
      });
    });
  }

  // Generate Workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "M-FLEM Integrated Report");

  // Robust download for browser (Vercel Production friendly)
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const company = plant.company.replace(/\s+/g, '_');
  const site = plant.plantName.replace(/\s+/g, '_');
  const filename = `MFLE_REPORT_${company}_${site}_${new Date().toISOString().split('T')[0]}.xlsx`;

  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
