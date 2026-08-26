import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const existingCount = await prisma.node.count();
  if (existingCount > 0) {
    console.log(
      `Seed skipped: graph already has ${existingCount} node(s). Delete nodes first if you want a fresh seed.`,
    );
    return;
  }

  const machineLearning = await prisma.node.create({
    data: {
      title: "Machine Learning",
      summary: "Algorithms that learn patterns from data.",
      contents: {
        create: [
          {
            type: "TEXT",
            text: "Machine learning is a subset of AI focused on models that improve from experience without being explicitly programmed for every case.",
          },
          {
            type: "LINK",
            url: "https://en.wikipedia.org/wiki/Machine_learning",
            text: "Wikipedia overview",
          },
        ],
      },
    },
  });

  const supervised = await prisma.node.create({
    data: {
      title: "Supervised Learning",
      summary: "Learn a mapping from labeled examples.",
      contents: {
        create: {
          type: "TEXT",
          text: "In supervised learning, each training example has an input and a known target label. Common tasks: classification and regression.",
        },
      },
    },
  });

  const unsupervised = await prisma.node.create({
    data: {
      title: "Unsupervised Learning",
      summary: "Find structure without labels.",
      contents: {
        create: {
          type: "TEXT",
          text: "Unsupervised methods discover clusters, density, or latent factors when labels are unavailable.",
        },
      },
    },
  });

  const neuralNets = await prisma.node.create({
    data: {
      title: "Neural Networks",
      summary: "Layered models inspired by biological neurons.",
      contents: {
        create: [
          {
            type: "TEXT",
            text: "Neural nets compose linear transforms and nonlinear activations. Depth and width control expressive power.",
          },
          {
            type: "LINK",
            url: "https://www.deeplearningbook.org/",
            text: "Deep Learning book",
          },
        ],
      },
    },
  });

  const backprop = await prisma.node.create({
    data: {
      title: "Backpropagation",
      summary: "Efficient gradient computation via chain rule.",
      contents: {
        create: {
          type: "TEXT",
          text: "Backprop reverses the forward computation graph to propagate error signals and update weights with gradient descent.",
        },
      },
    },
  });

  const features = await prisma.node.create({
    data: {
      title: "Feature Engineering",
      summary: "Transform raw inputs into useful signals.",
      contents: {
        create: {
          type: "TEXT",
          text: "Good features encode domain knowledge: scaling, encoding categoricals, time windows, embeddings, and derived ratios.",
        },
      },
    },
  });

  const evaluation = await prisma.node.create({
    data: {
      title: "Model Evaluation",
      summary: "Measure generalization, not just training fit.",
      contents: {
        create: {
          type: "TEXT",
          text: "Hold-out sets, cross-validation, and metrics (accuracy, F1, RMSE, calibration) help detect overfitting and choose models.",
        },
      },
    },
  });

  const overfitting = await prisma.node.create({
    data: {
      title: "Overfitting",
      summary: "When a model memorizes noise instead of signal.",
      contents: {
        create: {
          type: "TEXT",
          text: "Regularization, more data, simpler models, and early stopping are common remedies when train error is low but test error is high.",
        },
      },
    },
  });

  const links: Array<[string, string]> = [
    [machineLearning.id, supervised.id],
    [machineLearning.id, unsupervised.id],
    [machineLearning.id, features.id],
    [supervised.id, neuralNets.id],
    [supervised.id, evaluation.id],
    [neuralNets.id, backprop.id],
    [evaluation.id, overfitting.id],
    [features.id, evaluation.id],
  ];

  await prisma.edge.createMany({
    data: links.map(([sourceNodeId, targetNodeId]) => ({
      sourceNodeId,
      targetNodeId,
      weight: 1,
    })),
  });

  console.log(
    `Seeded default graph: 8 nodes, ${links.length} edges (root: Machine Learning).`,
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
