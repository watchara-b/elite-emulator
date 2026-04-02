import React, { useState } from 'react';
import { TileGrass, TileWater, TileDirt, TileSand, TileRoad } from './assets/tiles';
import { ResTree, ResRock, ResGold, ResOil, ResCrystal } from './assets/resources';
import { BuildTownHall, BuildLumberCamp, BuildHouse, BuildBarracks, BuildWarFactory, BuildTurret, BuildWall, BuildPowerPlant, BuildRefinery } from './assets/buildings';
import { CharWorker, CharSoldier, CharTank, CharArcher, CharCavalry, CharHealer } from './assets/characters';
import { FxExplosion, FxSmoke, FxHeal, FxMuzzleFlash, UiCoin, UiHeart, UiSword, UiShield } from './assets/effects';
import { ThaiCommandCenter, ThaiScrapMiner, ThaiTukTukRocket, ThaiNagaSub, ThaiGoldenResonator, ThaiLotusToxin, ThaiScrapOutpost } from './assets/faction-thailand';
import { JapanCommandCenter, JapanQuantumHarvester, JapanRoninCyborg, JapanKaijuCarrier, JapanVoidGenerator, JapanBanzaiOverdrive, JapanCyberGrid } from './assets/faction-japan';
import { SwissCommandCenter, SwissCryoMiner, SwissAlpsBehemoth, SwissCuckooDrone, SwissZeroCollider, SwissCryoLockdown, SwissAlpineDefense } from './assets/faction-switzerland';
import { BrazilCommandCenter, BrazilBioHarvester, BrazilMutantStalker, BrazilBioMortar, BrazilHiveBomb, BrazilMutagenicBloom, BrazilMutatedAmazon } from './assets/faction-brazil';
import { EgyptCommandCenter, EgyptAlienHarvester, EgyptSunGodWalker, EgyptSandStealth, EgyptSolarisArray, EgyptHoloMirage, EgyptSolarDesert } from './assets/faction-egypt';

const assetsData = [
  // Tiles
  { id: 't1', name: 'หญ้า (Grass)', category: 'Tiles', component: TileGrass, desc: 'พื้นฐานสำหรับสร้างสิ่งปลูกสร้างทั่วไป' },
  { id: 't2', name: 'น้ำ (Water)', category: 'Tiles', component: TileWater, desc: 'ไม่สามารถสร้างของทับได้ ใช้เป็นอุปสรรคหรือแหล่งตกปลา' },
  { id: 't3', name: 'ดิน (Dirt)', category: 'Tiles', component: TileDirt, desc: 'พื้นสำหรับทำฟาร์มเพาะปลูก' },
  { id: 't4', name: 'ทราย (Sand)', category: 'Tiles', component: TileSand, desc: 'พื้นทะเลทราย ลดความเร็วยูนิต' },
  { id: 't5', name: 'ถนน (Road)', category: 'Tiles', component: TileRoad, desc: 'เพิ่มความเร็วยูนิตที่เดินผ่าน' },
  // Resources
  { id: 'r1', name: 'ต้นไม้ (Tree)', category: 'Resources', component: ResTree, desc: 'แหล่งทรัพยากร "ไม้" สำหรับก่อสร้าง' },
  { id: 'r2', name: 'ก้อนหิน (Rock)', category: 'Resources', component: ResRock, desc: 'แหล่งทรัพยากร "หิน" สำหรับสร้างกำแพงและฐานทัพ' },
  { id: 'r3', name: 'แร่ทอง (Gold Ore)', category: 'Resources', component: ResGold, desc: 'ทรัพยากรหายาก ใช้สำหรับอัปเกรดระดับสูง' },
  { id: 'r4', name: 'บ่อน้ำมัน (Oil)', category: 'Resources', component: ResOil, desc: 'เชื้อเพลิงสำหรับยานพาหนะและโรงงาน' },
  { id: 'r5', name: 'คริสตัล (Crystal)', category: 'Resources', component: ResCrystal, desc: 'ทรัพยากรพิเศษ ใช้ปลดล็อคเทคโนโลยีขั้นสูง' },
  // Buildings
  { id: 'b1', name: 'ศูนย์บัญชาการ (Town Hall)', category: 'Buildings', component: BuildTownHall, desc: 'หัวใจหลักของฐานทัพ หากถูกทำลายคือจบเกม' },
  { id: 'b2', name: 'โรงตัดไม้ (Lumber Camp)', category: 'Buildings', component: BuildLumberCamp, desc: 'เพิ่มความเร็วในการเก็บไม้ในระยะโดยรอบ' },
  { id: 'b3', name: 'บ้านพัก (House)', category: 'Buildings', component: BuildHouse, desc: 'เพิ่มจำนวนประชากร (Population Limit)' },
  { id: 'b4', name: 'ค่ายทหาร (Barracks)', category: 'Buildings', component: BuildBarracks, desc: 'ผลิตยูนิตทหารราบ นักธนู และหมอ' },
  { id: 'b5', name: 'โรงงานสงคราม (War Factory)', category: 'Buildings', component: BuildWarFactory, desc: 'ผลิตยานเกราะและรถถัง' },
  { id: 'b6', name: 'ป้อมปืน (Turret)', category: 'Buildings', component: BuildTurret, desc: 'โจมตีศัตรูอัตโนมัติในระยะ' },
  { id: 'b7', name: 'กำแพง (Wall)', category: 'Buildings', component: BuildWall, desc: 'ป้องกันฐานทัพ ศัตรูต้องทำลายก่อนผ่าน' },
  { id: 'b8', name: 'โรงไฟฟ้า (Power Plant)', category: 'Buildings', component: BuildPowerPlant, desc: 'ผลิตพลังงานให้อาคารอื่นทำงาน' },
  { id: 'b9', name: 'โรงกลั่น (Refinery)', category: 'Buildings', component: BuildRefinery, desc: 'แปรรูปทรัพยากรดิบเป็นวัสดุใช้งาน' },
  // Characters
  { id: 'c1', name: 'คนงาน (Worker)', category: 'Characters', component: CharWorker, desc: 'ยูนิตสำหรับสร้างสิ่งปลูกสร้างและเก็บทรัพยากร' },
  { id: 'c2', name: 'ทหาร (Soldier)', category: 'Characters', component: CharSoldier, desc: 'ยูนิตรบระยะไกล ดาเมจปานกลาง' },
  { id: 'c3', name: 'รถถัง (Tank)', category: 'Characters', component: CharTank, desc: 'ยานเกราะหนัก ดาเมจสูง เคลื่อนที่ช้า' },
  { id: 'c4', name: 'นักธนู (Archer)', category: 'Characters', component: CharArcher, desc: 'ยูนิตระยะไกล ดาเมจต่ำแต่ยิงเร็ว' },
  { id: 'c5', name: 'ทหารม้า (Cavalry)', category: 'Characters', component: CharCavalry, desc: 'ยูนิตเคลื่อนที่เร็ว เหมาะโจมตีแบบจู่โจม' },
  { id: 'c6', name: 'หมอ (Healer)', category: 'Characters', component: CharHealer, desc: 'รักษายูนิตฝ่ายเดียวกันในระยะ' },
  // Effects & UI
  { id: 'e1', name: 'ระเบิด (Explosion)', category: 'Effects', component: FxExplosion, desc: 'เอฟเฟกต์เมื่อสิ่งปลูกสร้างหรือยูนิตถูกทำลาย' },
  { id: 'e2', name: 'ควัน (Smoke)', category: 'Effects', component: FxSmoke, desc: 'เอฟเฟกต์ควันจากอาคารที่เสียหาย' },
  { id: 'e3', name: 'รักษา (Heal)', category: 'Effects', component: FxHeal, desc: 'เอฟเฟกต์เมื่อยูนิตถูกรักษา' },
  { id: 'e4', name: 'แสงปืน (Muzzle Flash)', category: 'Effects', component: FxMuzzleFlash, desc: 'เอฟเฟกต์เมื่อยูนิตยิงอาวุธ' },
  { id: 'u1', name: 'เหรียญ (Coin)', category: 'UI', component: UiCoin, desc: 'ไอคอนแสดงทรัพยากรเงิน' },
  { id: 'u2', name: 'หัวใจ (Heart)', category: 'UI', component: UiHeart, desc: 'ไอคอนแสดง HP ของยูนิต' },
  { id: 'u3', name: 'ดาบ (Sword)', category: 'UI', component: UiSword, desc: 'ไอคอนแสดงค่าโจมตี' },
  { id: 'u4', name: 'โล่ (Shield)', category: 'UI', component: UiShield, desc: 'ไอคอนแสดงค่าป้องกัน' },
  // Thailand - Siam Syndicate
  { id: 'th1', name: '🇹🇭 Command Center', category: 'Thailand', component: ThaiCommandCenter, desc: 'ฐานบัญชาการ — วัดไทยไฮเทคผสมเศษเหล็ก พลังจิตสีชมพู' },
  { id: 'th2', name: '🇹🇭 Scrap Miner', category: 'Thailand', component: ThaiScrapMiner, desc: 'รถขุดแร่สยามไซดิเคต — สว่านหน้า ถังเก็บสารเคมีสีชมพู' },
  { id: 'th3', name: '🇹🇭 Tuk-Tuk Rocket', category: 'Thailand', component: ThaiTukTukRocket, desc: 'ตุ๊กตุ๊กติดจรวด — ยิงจรวดและปล่อยควันพรางตัว' },
  { id: 'th4', name: '🇹🇭 Naga Sub', category: 'Thailand', component: ThaiNagaSub, desc: 'หุ่นยนต์งูทะเลสะเทินน้ำสะเทินบก — คลื่นเสียงโซนิค' },
  { id: 'th5', name: '🇹🇭 Golden Resonator', category: 'Thailand', component: ThaiGoldenResonator, desc: 'เจดีย์ขยายสัญญาณจิต — Superweapon ควบคุมจิตใจ' },
  { id: 'th6', name: '🇹🇭 Lotus Toxin', category: 'Thailand', component: ThaiLotusToxin, desc: 'ไอคอนสกิล — สารสกัดดอกบัวมรณะ ก๊าซหลอนประสาท' },
  { id: 'th7', name: '🇹🇭 Scrap Outpost', category: 'Thailand', component: ThaiScrapOutpost, desc: 'ฉากฐานทัพเศษเหล็ก — แอ่งสารเคมีสีชมพู' },
  // Japan - Zaibatsu Shogunate
  { id: 'jp1', name: '🇯🇵 Cyber Castle', category: 'Japan', component: JapanCommandCenter, desc: 'ฐานบัญชาการ — ปราสาทไซเบอร์พังค์ ควอนตัมเทค' },
  { id: 'jp2', name: '🇯🇵 Quantum Harvester', category: 'Japan', component: JapanQuantumHarvester, desc: 'รถขุดแร่ควอนตัม — เลเซอร์สีแดงขุดแร่' },
  { id: 'jp3', name: '🇯🇵 Ronin Cyborg', category: 'Japan', component: JapanRoninCyborg, desc: 'ทหารไซบอร์กดาบพลาสม่า — ดาบคาตานะสีแดง' },
  { id: 'jp4', name: '🇯🇵 Kaiju-Carrier', category: 'Japan', component: JapanKaijuCarrier, desc: 'เรือบรรทุกแปลงร่างเป็นไคจู — แกนควอนตัมสีแดง' },
  { id: 'jp5', name: '🇯🇵 Void Generator', category: 'Japan', component: JapanVoidGenerator, desc: 'เครื่องกำเนิดหลุมดำ — Superweapon ฉีกมิติ' },
  { id: 'jp6', name: '🇯🇵 Banzai Overdrive', category: 'Japan', component: JapanBanzaiOverdrive, desc: 'ไอคอนสกิล — โปรโตคอลโอเวอร์ไดรฟ์ ฉีดนาโนบอท' },
  { id: 'jp7', name: '🇯🇵 Cyber Grid', category: 'Japan', component: JapanCyberGrid, desc: 'ฉากเมืองทุนนิยมไซเบอร์ — ถนนนีออนโตเกียว' },
  // Switzerland - Swiss Directorate
  { id: 'ch1', name: '🇨🇭 Alpine Fortress', category: 'Switzerland', component: SwissCommandCenter, desc: 'ฐานบัญชาการ — ป้อมปราการสวิสไครโอเทค' },
  { id: 'ch2', name: '🇨🇭 Cryo Miner', category: 'Switzerland', component: SwissCryoMiner, desc: 'รถขุดแร่แช่แข็ง — เกราะหนัก โล่ปริซึม' },
  { id: 'ch3', name: '🇨🇭 Alps Behemoth', category: 'Switzerland', component: SwissAlpsBehemoth, desc: 'รถถังยักษ์กางบาเรีย — โดมพลังงานสีฟ้า' },
  { id: 'ch4', name: '🇨🇭 Cuckoo Drone', category: 'Switzerland', component: SwissCuckooDrone, desc: 'โดรนสอดแนม/แฮกเกอร์ — ขโมยเครดิต' },
  { id: 'ch5', name: '🇨🇭 Zero Collider', category: 'Switzerland', component: SwissZeroCollider, desc: 'เครื่องแช่แข็งแผนที่ — Superweapon ระเบิดศูนย์องศา' },
  { id: 'ch6', name: '🇨🇭 Cryo Lockdown', category: 'Switzerland', component: SwissCryoLockdown, desc: 'ไอคอนสกิล — แช่แข็งสิ่งก่อสร้าง' },
  { id: 'ch7', name: '🇨🇭 Alpine Defense', category: 'Switzerland', component: SwissAlpineDefense, desc: 'ฉากภูเขาหิมะและป้อมปราการ' },
  // Brazil - Amazonian Mutagenics
  { id: 'br1', name: '🇧🇷 Bio Nexus', category: 'Brazil', component: BrazilCommandCenter, desc: 'ฐานบัญชาการ — พืชกลายพันธุ์ผสมเต็นท์ทหาร' },
  { id: 'br2', name: '🇧🇷 Bio-Harvester', category: 'Brazil', component: BrazilBioHarvester, desc: 'รถขุดแร่ชีวภาพ — แมลงยักษ์ลูกผสม' },
  { id: 'br3', name: '🇧🇷 Mutant Stalker', category: 'Brazil', component: BrazilMutantStalker, desc: 'ทหารกลายพันธุ์พรางตัว — มีดพิษ' },
  { id: 'br4', name: '🇧🇷 Bio-Mortar', category: 'Brazil', component: BrazilBioMortar, desc: 'ปืนใหญ่ชีวภาพแมลง — ยิงสปอร์กรด' },
  { id: 'br5', name: '🇧🇷 Hive-Bomb', category: 'Brazil', component: BrazilHiveBomb, desc: 'ระเบิดฝูงมฤตยู — Superweapon ฝูงตั๊กแตนไซเบอร์' },
  { id: 'br6', name: '🇧🇷 Mutagenic Bloom', category: 'Brazil', component: BrazilMutagenicBloom, desc: 'ไอคอนสกิล — กำแพงต้นไม้พิษ' },
  { id: 'br7', name: '🇧🇷 Mutated Amazon', category: 'Brazil', component: BrazilMutatedAmazon, desc: 'ฉากป่ากลายพันธุ์ — เห็ดม่วง หนองพิษ' },
  // Egypt - Pharaonic Order
  { id: 'eg1', name: '🇪🇬 Pyramid Command', category: 'Egypt', component: EgyptCommandCenter, desc: 'ฐานบัญชาการ — พีระมิดเอเลี่ยนเทค' },
  { id: 'eg2', name: '🇪🇬 Alien Harvester', category: 'Egypt', component: EgyptAlienHarvester, desc: 'รถขุดแร่เอเลี่ยนเทค — เลเซอร์พลังแสง' },
  { id: 'eg3', name: '🇪🇬 Sun-God Walker', category: 'Egypt', component: EgyptSunGodWalker, desc: 'หุ่นยนต์อนูบิส 4 ขา — เลเซอร์ความร้อน' },
  { id: 'eg4', name: '🇪🇬 Sand Stealth', category: 'Egypt', component: EgyptSandStealth, desc: 'รถสร้างพายุทราย EMP — ซ่อนยูนิต' },
  { id: 'eg5', name: '🇪🇬 Solaris Array', category: 'Egypt', component: EgyptSolarisArray, desc: 'เสาแสงทำลายล้างจากอวกาศ — Superweapon' },
  { id: 'eg6', name: '🇪🇬 Holo-Mirage', category: 'Egypt', component: EgyptHoloMirage, desc: 'ไอคอนสกิล — เครื่องสร้างภาพลวงตา' },
  { id: 'eg7', name: '🇪🇬 Solar Desert', category: 'Egypt', component: EgyptSolarDesert, desc: 'ฉากทะเลทรายพลังงานแสงอาทิตย์' },
];

const categories = ['All', 'Tiles', 'Resources', 'Buildings', 'Characters', 'Effects', 'UI', 'Thailand', 'Japan', 'Switzerland', 'Brazil', 'Egypt'];
const catLabels = { All: 'ทั้งหมด', Tiles: 'Tiles', Resources: 'Resources', Buildings: 'Buildings', Characters: 'Characters', Effects: 'Effects', UI: 'UI Icons', Thailand: '🇹🇭 Siam Syndicate', Japan: '🇯🇵 Zaibatsu', Switzerland: '🇨🇭 Swiss', Brazil: '🇧🇷 Amazonian', Egypt: '🇪🇬 Pharaonic' };

export default function App() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredAssets = activeCategory === 'All'
    ? assetsData
    : assetsData.filter(a => a.category === activeCategory);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto">

        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-4 tracking-tight">
            Base Builder 2D Asset Pack
          </h1>
          <p className="text-slate-400 text-lg">
            ชุดกราฟิก SVG 2D สำหรับพัฒนาเกมแนวสร้างฐานทัพ — {assetsData.length} assets ใน {categories.length - 1} หมวด
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {catLabels[cat]} {cat !== 'All' && <span className="ml-1 text-xs opacity-60">({assetsData.filter(a => a.category === cat).length})</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAssets.map(asset => {
            const SvgIcon = asset.component;
            const isTile = asset.category === 'Tiles';

            return (
              <div
                key={asset.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/20 transition-all duration-300 group"
              >
                <div className={`h-48 w-full flex items-center justify-center ${isTile ? 'p-0 bg-slate-900/50' : 'p-6 bg-slate-800'}`}>
                  <div className={`transition-transform duration-300 group-hover:scale-110 ${isTile ? 'w-full h-full' : 'w-32 h-32'}`}>
                    <SvgIcon />
                  </div>
                </div>

                <div className="p-5 bg-slate-800/80 border-t border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">{asset.name}</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-700 text-blue-300 whitespace-nowrap">
                      {asset.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{asset.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">💡 วิธีนำไปใช้งานใน Game Engine</h2>
          <ul className="space-y-3 text-slate-300 list-disc list-inside">
            <li><strong>Tiles (พื้นผิว):</strong> ขนาดมาตรฐาน 64x64 หรือ 128x128 px นำไปตั้งค่าใน Tilemap</li>
            <li><strong>Resources & Buildings:</strong> ตั้ง Pivot ที่ Bottom-Center เพื่อ Y-Sort ได้สมจริง</li>
            <li><strong>Characters:</strong> ใช้เป็น base frame แล้วเพิ่ม animation states (idle, walk, attack, die)</li>
            <li><strong>Effects:</strong> ใช้เป็น sprite sheet หรือ particle template ตั้ง blend mode เป็น Additive</li>
            <li><strong>UI Icons:</strong> ใช้ในแถบ HUD แสดงค่าสถานะต่างๆ ของยูนิตและทรัพยากร</li>
            <li><strong>Hitbox:</strong> ทำเฉพาะส่วนฐานที่ติดพื้น ตัวละครจะได้เดินอ้อมด้านหลังได้</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
