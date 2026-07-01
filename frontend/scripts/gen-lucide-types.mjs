import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const lucide = await import("lucide-react");
const iconNames = Object.keys(lucide)
  .filter(k => k !== "__esModule" && k !== "createLucideIcon" && k !== "icons" && k !== "useLucideContext" && k !== "default" && k !== "module.exports")
  .sort();

let dts = `declare module "lucide-react" {
  import { FC, SVGProps } from "react";

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
  }
  export type Icon = FC<LucideProps>;

`;

for (const name of iconNames) {
  dts += `  export const ${name}: Icon;\n`;
}

dts += `}\n`;

const outPath = resolve(__dirname, "..", "src", "types", "lucide-react.d.ts");
writeFileSync(outPath, dts);
console.log(`Generated ${iconNames.length} icon exports -> ${outPath}`);
