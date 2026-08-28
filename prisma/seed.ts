import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { stringifyDoc } from "../src/lib/rich-text";
import type { TipTapMark, TipTapNode } from "../src/lib/rich-text";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function t(text: string, marks?: TipTapMark[]): TipTapNode {
  return marks?.length ? { type: "text", text, marks } : { type: "text", text };
}

function p(...content: TipTapNode[]): TipTapNode {
  return { type: "paragraph", content };
}

function h2(text: string): TipTapNode {
  return { type: "heading", attrs: { level: 2 }, content: [t(text)] };
}

function bullets(items: string[]): TipTapNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [p(t(item))],
    })),
  };
}

function link(href: string, label: string): TipTapNode {
  return t(label, [{ type: "link", attrs: { href } }]);
}

function note(content: TipTapNode[]): string {
  return stringifyDoc({ type: "doc", content });
}

type SeedNode = {
  title: string;
  summary: string;
  text: string;
};

const starterNodes: SeedNode[] = [
  {
    title: "Learning from data",
    summary:
      "Turn examples into a rule that still works on cases you have not seen.",
    text: note([
      p(
        t(
          "The move is always the same: collect examples of a phenomenon, pick a family of functions, and search for one that predicts well on data the model has not been shown yet. Fitting the training set is the easy part. The work is deciding what “works” means.",
        ),
      ),
      p(
        t(
          "Two forks show up immediately: whether examples come with answers, and whether the output is a class, a number, a ranking, or something generated. Name the fork before picking an algorithm — the framing is the real design choice.",
        ),
      ),
      h2("Open threads"),
      bullets([
        "Supervised vs unsupervised vs reinforcement — when each framing actually fits",
        "Loss functions: what you optimize is what you get",
        "Train / validation / test as a scientific method, not a ritual",
      ]),
      h2("Starting points"),
      p(link("https://work.caltech.edu/telecourse.html", "Learning From Data (Caltech)")),
      p(
        link(
          "https://www.cs.cmu.edu/~tom/mlbook.html",
          "Tom Mitchell — Machine Learning",
        ),
      ),
    ]),
  },
  {
    title: "Linear algebra",
    summary: "Vectors and matrices are how models hold and transform meaning.",
    text: note([
      p(
        t(
          "Almost every modern model is linear algebra plus a little nonlinearity. A data point is a vector. A layer is a matrix multiply. Similarity is a dot product. Geometry is the intuition: which directions matter, which subspaces collapse noise, which distances mean “alike.”",
        ),
      ),
      p(
        t(
          "You do not need a full course to start, but you do need fluency with multiply, transpose, and the sentence “this vector lives in that space.” Once that is automatic, papers and implementations stop looking like a foreign language.",
        ),
      ),
      h2("Open threads"),
      bullets([
        "Eigenvalues and PCA — finding the axes that actually vary",
        "SVD as the default tool for compressing a representation",
        "Why embeddings can be added and subtracted at all",
      ]),
      h2("Starting points"),
      p(
        link(
          "https://www.3blue1brown.com/topics/linear-algebra",
          "3Blue1Brown — Essence of linear algebra",
        ),
      ),
      p(
        link(
          "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
          "Gilbert Strang — MIT 18.06",
        ),
      ),
    ]),
  },
  {
    title: "Probability",
    summary: "Talk about uncertainty instead of pretending the next input is known.",
    text: note([
      p(
        t(
          "Data is noisy. Labels disagree. Tomorrow’s input is not in today’s sample. Probability is the language for that. Bayes is the update rule: start with a prior, see evidence, get a posterior. A lot of “learning” is that update, run at scale.",
        ),
      ),
      p(
        t(
          "A handful of distributions — Bernoulli, Gaussian, categorical — are the building blocks of both generative stories and loss functions. If you can write the likelihood, you can usually write the training objective.",
        ),
      ),
      h2("Open threads"),
      bullets([
        "Maximum likelihood vs Bayesian inference — two attitudes toward parameters",
        "Entropy and information: what a model is actually compressing",
        "Calibration: an 80% confident model should be right 80% of the time",
      ]),
      h2("Starting points"),
      p(link("https://seeing-theory.brown.edu/", "Seeing Theory")),
      p(link("https://projects.iq.harvard.edu/stat110", "Stat 110 — Probability")),
    ]),
  },
  {
    title: "Neural networks",
    summary:
      "Stack linear maps and nonlinearities until the function is rich enough.",
    text: note([
      p(
        t(
          "One linear layer is logistic regression. Depth is what lets features compose: edges into parts into objects, or tokens into phrases into intent. Width, depth, and inductive bias (convolutions, attention) are how we tell the model what structure to expect in the world.",
        ),
      ),
      p(
        t(
          "The training loop is mechanical: forward pass, compare to a target, send gradients back, step the weights. The research lives in architecture, data, and the objective — not in the loop itself.",
        ),
      ),
      h2("Open threads"),
      bullets([
        "Backpropagation, and why the chain rule scales to millions of parameters",
        "Convolutions vs transformers — what structure each assumes",
        "Scaling: when more data and compute beat a cleverer architecture",
      ]),
      h2("Starting points"),
      p(
        link(
          "https://karpathy.ai/zero-to-hero.html",
          "Karpathy — Neural Networks: Zero to Hero",
        ),
      ),
      p(link("https://www.deeplearningbook.org/", "Deep Learning book")),
    ]),
  },
  {
    title: "Generalization",
    summary: "Fit the phenomenon, not the sample you happened to collect.",
    text: note([
      p(
        t(
          "Training error going to zero is easy. The question is what happens on the next point. Overfitting is the default: a flexible model will explain noise if you let it. Regularization, more data, early stopping, and simpler hypotheses are different names for the same pressure.",
        ),
      ),
      p(
        t(
          "Evaluation is a design choice. Accuracy hides class imbalance. A metric should match the decision you will actually make, and the split should match the world the model will meet — not a shuffled copy of the training file.",
        ),
      ),
      h2("Open threads"),
      bullets([
        "Bias–variance as a diagnostic, not a slogan",
        "Cross-validation, and leakage as the silent way numbers lie",
        "Distribution shift: production is not a random draw from the training set",
      ]),
      h2("Starting points"),
      p(
        link(
          "https://developers.google.com/machine-learning/crash-course/generalization/video-lecture",
          "Google ML Crash Course — Generalization",
        ),
      ),
    ]),
  },
];

const starterEdges: Array<[string, string]> = [
  ["Learning from data", "Linear algebra"],
  ["Learning from data", "Probability"],
  ["Learning from data", "Neural networks"],
  ["Learning from data", "Generalization"],
  ["Linear algebra", "Neural networks"],
  ["Probability", "Generalization"],
];

async function main() {
  const existingCount = await prisma.node.count();
  if (existingCount > 0) {
    console.log(
      `Seed skipped: graph already has ${existingCount} node(s). Delete nodes first if you want a fresh seed.`,
    );
    return;
  }

  let graph = await prisma.graph.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!graph) {
    graph = await prisma.graph.create({
      data: {
        name: "Machine learning foundations",
        notes:
          "Starter graph for exploring AI and machine learning fundamentals.",
      },
    });
  }

  const ids = new Map<string, string>();
  for (const spec of starterNodes) {
    const node = await prisma.node.create({
      data: {
        graphId: graph.id,
        title: spec.title,
        summary: spec.summary,
        contents: {
          create: { type: "TEXT", text: spec.text },
        },
      },
    });
    ids.set(spec.title, node.id);
  }

  await prisma.edge.createMany({
    data: starterEdges.map(([sourceTitle, targetTitle]) => {
      const sourceNodeId = ids.get(sourceTitle);
      const targetNodeId = ids.get(targetTitle);
      if (!sourceNodeId || !targetNodeId) {
        throw new Error(`Seed edge missing node: ${sourceTitle} → ${targetTitle}`);
      }
      return { sourceNodeId, targetNodeId, weight: 1 };
    }),
  });

  await prisma.graph.update({
    where: { id: graph.id },
    data: { updatedAt: new Date() },
  });

  console.log(
    `Seeded starter graph "${graph.name}": ${starterNodes.length} nodes, ${starterEdges.length} edges.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
