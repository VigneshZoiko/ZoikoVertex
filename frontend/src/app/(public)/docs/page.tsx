import fs from "fs";
import path from "path";
import { serialize } from "next-mdx-remote/serialize";
import DocsClient from "./DocsClient";

export const dynamic = "force-dynamic";

const CATEGORY_MAP = [
  { id: "getting-started",      file: "01-getting-started.mdx" },
  { id: "campaigns-publishing", file: "02-campaigns-publishing.mdx" },
  { id: "analytics",           file: "03-analytics.mdx" },
  { id: "ai-agents",           file: "04-ai-agents.mdx" },
  { id: "governance",          file: "05-governance.mdx" },
  { id: "evidence",            file: "06-evidence.mdx" },
  { id: "integrations",        file: "07-integrations.mdx" },
  { id: "system-admin",        file: "08-system-admin.mdx" },
];

export default async function DocsPage() {
  const contentDir = path.join(process.cwd(), "src/app/(public)/docs/content");

  const serialized = await Promise.all(
    CATEGORY_MAP.map(async (cat) => {
      const filePath = path.join(contentDir, cat.file);
      const source = fs.readFileSync(filePath, "utf-8");
      const mdxSource = await serialize(source);
      return { id: cat.id, source: mdxSource };
    })
  );

  const sourceMap: Record<string, typeof serialized[0]["source"]> = {};
  for (const s of serialized) {
    sourceMap[s.id] = s.source;
  }

  return <DocsClient serializedSources={sourceMap} />;
}
