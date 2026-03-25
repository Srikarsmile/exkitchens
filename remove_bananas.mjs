import fs from 'fs';

const match = fs.readFileSync('.env.local', 'utf-8').match(/FAL_KEY=(.*)/);
const FAL_KEY = match ? match[1].trim() : null;

if (!FAL_KEY || FAL_KEY === 'your_actual_api_key_here') process.exit(1);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const prompts = [
  // The Logo used in the Navbar
  {
    name: "exkitchens_geometric_logo_2",
    endpoint: "fal-ai/nano-banana-2",
    ar: "16:9",
    prompt: "A modern, creative, flat vector logo for 'ExKitchens'. A geometric icon on the left made of beautiful overlapping circles in muted teal and charcoal. To the right, the brand name 'ExKitchens' in clean, sophisticated typography. Pure white background. Minimalist, elegant, corporate identity. Zero bananas."
  },
  // The Hero Images used in the background
  {
    name: "kitchen_nano_ultrawide_1",
    endpoint: "fal-ai/nano-banana-2",
    ar: "21:9",
    prompt: "Extremely high resolution 8k, razor-sharp focus, incredibly clear, stunning, wide sunlit modern luxury kitchen. Classic white shaker cabinets, stunning Calcutta marble island. Architectural digest quality, completely photorealistic, macro-lens clarity. Zero bananas."
  },
  {
    name: "kitchen_nano_ultrawide_2",
    endpoint: "fal-ai/nano-banana-2",
    ar: "21:9",
    prompt: "Extremely high resolution 8k, spectacular photorealistic luxury kitchen interior in bright daylight. Minimalist Scandinavian design, wide panorama, light oak wood and matte white surfaces, sleek integrated appliances. Premium daylight photography. Zero bananas."
  }
];

async function generate() {
  for (const p of prompts) {
    console.log(`Generating ${p.name}...`);
    try {
      const res = await fetch(`https://queue.fal.run/${p.endpoint}`, {
        method: "POST",
        headers: { "Authorization": `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p.prompt, aspect_ratio: p.ar, output_format: "png" })
      });
      const { request_id } = await res.json();
      if (!request_id) continue;
      
      let isComplete = false;
      while (!isComplete) {
        await sleep(2000);
        const st = await (await fetch(`https://queue.fal.run/${p.endpoint}/requests/${request_id}/status`, { headers: { "Authorization": `Key ${FAL_KEY}` } })).json();
        if (st.status === 'COMPLETED') isComplete = true;
        else if (st.status !== 'IN_PROGRESS' && st.status !== 'IN_QUEUE') break;
      }
      
      if (isComplete) {
        const result = await (await fetch(`https://queue.fal.run/${p.endpoint}/requests/${request_id}`, { headers: { "Authorization": `Key ${FAL_KEY}` } })).json();
        if (result.images?.length > 0) {
          const buffer = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer());
          fs.writeFileSync(`./public/assets/${p.name}.png`, buffer);
          console.log(`Saved ${p.name}.png`);
        }
      }
    } catch (e) { console.error("Error", e); }
  }
}
generate();
