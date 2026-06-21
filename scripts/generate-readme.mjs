import fs from "fs";
import path from "path";
import matter from "gray-matter";

const SITE_URL = "https://www.eduardomotta.dev";
const EXCERPT_LENGTH = 150;

function parseArgs(argv) {
  const args = { postsDir: "../personal-website/posts", limit: 5, outFile: "README.md" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--posts-dir" && argv[i + 1]) args.postsDir = argv[++i];
    else if (argv[i] === "--limit" && argv[i + 1]) args.limit = Number(argv[++i]);
    else if (argv[i] === "--out-file" && argv[i + 1]) args.outFile = argv[++i];
  }
  return args;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function extractThumbnail(content) {
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return null;
  const src = match[1];
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
}

function extractExcerpt(content) {
  const withoutImages = content
    .replace(/<img[^>]*>/gi, "")
    .replace(/<small>[\s\S]*?<\/small>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\*\*/g, "")
    .trim();

  const paragraph = withoutImages
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .find((p) => p.length > 0);

  if (!paragraph) return "";
  if (paragraph.length <= EXCERPT_LENGTH) return paragraph;
  return `${paragraph.slice(0, EXCERPT_LENGTH).trimEnd()}...`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadPosts(postsDir) {
  const fileNames = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  return fileNames
    .map((fileName) => {
      const id = fileName.replace(/\.md$/, "");
      const fullPath = path.join(postsDir, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);

      return {
        id,
        title: data.title,
        date: data.date,
        thumbnail: extractThumbnail(content),
        excerpt: extractExcerpt(content),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function renderRow(post) {
  const url = `${SITE_URL}/posts/${post.id}`;
  const thumbnailCell = post.thumbnail
    ? `<td width="300px"><img src="${post.thumbnail}" alt="thumbnail"></td>`
    : `<td width="300px"></td>`;

  return `        <tr>
            ${thumbnailCell}
            <td>
                <a href="${url}">${escapeHtml(post.title)}</a>
                <div>${escapeHtml(post.excerpt)}</div>
                <div><i>${formatDate(post.date)}</i></div>
            </td>
        </tr>`;
}

function generateReadme(posts, limit) {
  const rows = posts.slice(0, limit).map(renderRow).join("\n");

  return `### My articles on [eduardomotta.dev](${SITE_URL}):


<table>
${rows}
</table>
`;
}

const { postsDir, limit, outFile } = parseArgs(process.argv);
const resolvedPostsDir = path.resolve(postsDir);

if (!fs.existsSync(resolvedPostsDir)) {
  console.error(`Posts directory not found: ${resolvedPostsDir}`);
  process.exit(1);
}

const posts = loadPosts(resolvedPostsDir);
const readme = generateReadme(posts, limit);
fs.writeFileSync(outFile, readme);
console.log(`Wrote ${outFile} with ${Math.min(limit, posts.length)} posts.`);
