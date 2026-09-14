<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brad-devices-wordmark/svg/brad-devices-wordmark-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/brad-devices-wordmark/svg/brad-devices-wordmark-black.svg">
    <img alt="BRAD DEVICES" width="360">
  </picture>
</p>

<p align="center">
  <em>of</em>&nbsp;&nbsp;
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brad-verse-wordmark/svg/brad-verse-wordmark-flat-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/brad-verse-wordmark/svg/brad-verse-wordmark-flat-light.svg">
    <img alt="BRADVERSE" width="190">
  </picture>
</p>

<p align="center">
  <code>This is not a pitch. This is a terminal.</code>
</p>

<p align="center">The entire computer stack — silicon, GPU, memory, OS, software — designed as <strong>one spec</strong> by Festus Bradley Nyadimo (The Architect).<br><em>I'm 15. I just designed lines of code that a fab could print.</em></p>

<p align="center">
  Live: <a href="https://brad-devices.vercel.app"><strong>https://brad-devices.vercel.app</strong></a>
</p>

---

## What this is

This is the source of the **BRAD DEVICES** website: the paper trail for an entire computer stack. Every claim here carries one of three receipts, and a tag that says exactly what a file can prove today:

| Receipt | Means |
|---------|-------|
| `SOLID / SHIPPED` | The software or document exists, opens today, runs unattended in CI. |
| `DESIGNED` | The silicon is fully registered and specced; production is a fab step. |
| `VISION` | Future physics, honestly labeled as such. |

Nothing is dressed up. No invented benchmarks, no pretend silicon.

## The stack — one machine, six parts

- **Silicon** — BradChip fuses CPU + GPU + NPU + the BradFusion fabric on one package (Lite P2+E4 → Max P8+E8). **BradXon** is the flagship: an Adaptive Neural Fabric that reallocates power, clock, and fabric budget to the workload — *budget, not silicon* (DESIGNED Gen 1).
- **GPU** — every **Torox** die (BFT100 integrated, BGT100 dedicated, BAT100 datacenter) runs the same **BradVector** engine. Write a kernel once; it runs from phone to rack.
- **Memory** — **BradRAM** (on-die L4 SRAM) + **SPMP** (unified LPDDR pool) = one pool. No more "VRAM vs the rest" — the wire that pretends to be a wall is gone.
- **OS** — **BradOS** across Mobile / Slate / Compute / Nano editions, with the **Kinetic Unified Driver** speaking Vulkan 1.4, DirectX 12 Ultimate, Metal 3, SYCL 2020. One driver stack; no driver zoo.
- **Products** — **BradMatrix** laptops, **BradOS Compute** workstations/servers, and the **BradAxis** console (Torox in a box, Nexus controller) — every device an instance of the same architecture.
- **Toolchain** — ships *before* the silicon: `bradc` assembler, **BVRT** (32-lane SIMT interpreter), `bradgdb`, **BradTimeline**, `braddev`, `bradlib.h`, the **TIFA** AI toolchain, and **BMS** cloud services. All stdlib-only, all runnable today.

## The proof

- **The book** — a 1,689-line unified compendium: 52 reference chapters, every register accounted for. Ships as a [39-page branded PDF](https://brad-devices.vercel.app/assets/BRAD_DEVICES_COMPLETE_SPEC.pdf).
- **The specs** — [BradISA](https://brad-devices.vercel.app/assets/specs/bradisa_spec.pdf), [BradISA v2 (VSET vector)](https://brad-devices.vercel.app/assets/specs/bradisa_v2_ext.pdf), [BradGFX](https://brad-devices.vercel.app/assets/specs/bradgfx_arch.pdf), [BradXon platform](https://brad-devices.vercel.app/assets/specs/bradxon_platform.pdf), [product portfolio](https://brad-devices.vercel.app/assets/specs/product_portfolio.pdf), and more, all linked from the site.
- **It runs** — the toolchain executes unattended in CI: `braddev test` 11/11 green, saxpy across all 32 lanes, round-trip bytecode tests, and an in-browser wasm build of the platform API.

## Structure

```
index.html       home — the pitch and the receipts
docs/            the specs, the 52-chapter tree
products/        every device, tagged SHIPPED / DESIGNED / VISION
ecosystem/       the six-part machine
founder/         the working-toolchain argument
glossary/        the name map, one receipt per name
achievements/    what actually ships, unattended in CI
css/ js/ assets/ styling, behaviour, and the brand
```

## Run it yourself

```bash
python3 -m http.server 8000
```

## Contact

- Email: brad.devices.official@gmail.com
- GitHub: https://github.com/BradDevicesOfficial

---

<p align="center"><em>Four years per step. Every one tagged before it ships. — The Architect</em></p>