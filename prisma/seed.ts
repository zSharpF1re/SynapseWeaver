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

type SeedGraph = {
  name: string;
  notes: string;
  nodes: SeedNode[];
  edges: Array<[string, string]>;
};

const graphs: SeedGraph[] = [
  {
    name: "Machine learning foundations",
    notes: "Starter graph for exploring AI and machine learning fundamentals.",
    nodes: [
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
    ],
    edges: [
      ["Learning from data", "Linear algebra"],
      ["Learning from data", "Probability"],
      ["Learning from data", "Neural networks"],
      ["Learning from data", "Generalization"],
      ["Linear algebra", "Neural networks"],
      ["Probability", "Generalization"],
    ],
  },
  {
    name: "Economics",
    notes: "Core ideas for reading prices, trade, and policy without the jargon first.",
    nodes: [
      {
        title: "Thinking like an economist",
        summary:
          "Ask what is scarce, who chooses, and what is given up — before naming a theory.",
        text: note([
          p(
            t(
              "Economics is a way of seeing trade-offs, not a list of forecasts. Something is scarce, someone chooses, and the choice has a cost that does not show up on a receipt. Models are cartoons of that: they drop most of the world so one mechanism can be seen clearly.",
            ),
          ),
          p(
            t(
              "The useful habit is to name the decision, the constraint, and the incentive before arguing about outcomes. “Should we do X?” is incomplete until you say compared with what, paid for how, and who bears the downside.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Positive vs normative: describing a trade-off is not the same as picking a side",
            "Models as maps — useful when they are wrong in a known way",
            "When markets coordinate well, and when they do not",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.core-econ.org/the-economy/",
              "CORE Econ — The Economy",
            ),
          ),
          p(
            link(
              "https://mru.org/courses/principles-economics-microeconomics",
              "Marginal Revolution University — Microeconomics",
            ),
          ),
        ]),
      },
      {
        title: "Opportunity cost",
        summary: "The real price of a choice is the next-best thing you did not do.",
        text: note([
          p(
            t(
              "Money is a convenient unit. Opportunity cost is the actual comparison: time, attention, a different project, a different life. Free tuition still costs the years you could have spent earning or building something else. A cheap factory still costs the river you cannot fish.",
            ),
          ),
          p(
            t(
              "Sunk costs are the trap on the other side. What you already spent is gone. The next decision only cares about what you still give up from here. That sounds obvious until you are defending a plan because you have already invested in it.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Accounting cost vs economic cost — why profit on paper can still be a loss",
            "Time as the scarce input that does not show up in a budget line",
            "Comparative advantage as opportunity cost applied to who should do what",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://mru.org/dictionary-economics/opportunity-cost-definition",
              "MRU — Opportunity cost",
            ),
          ),
          p(
            link(
              "https://www.econlib.org/library/Enc/OpportunityCost.html",
              "EconLib — Opportunity Cost",
            ),
          ),
        ]),
      },
      {
        title: "Supply and demand",
        summary:
          "Prices ration a scarce thing by reconciling how badly people want it with how costly it is to make.",
        text: note([
          p(
            t(
              "A demand curve is not a moral ranking. It is a schedule of how much people will buy at each price, holding other things fixed. A supply curve is how much sellers will offer as the return to producing rises. The intersection is a prediction, not a verdict: this is the price that clears if those schedules are roughly right.",
            ),
          ),
          p(
            t(
              "Shifts matter more than movements along a curve. A new preference, a cheaper input, a tax, a quota — each moves one schedule and leaves the other to adjust. Shortages and surpluses are what you get when a price is not allowed to do that work.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Elasticity: how much quantity actually moves when the price does",
            "Price ceilings and floors — who is helped, who is queued, who is missing",
            "When the “other things equal” assumption fails in a real market",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.khanacademy.org/economics-finance-domain/microeconomics/supply-demand-equilibrium",
              "Khan Academy — Supply, demand, and market equilibrium",
            ),
          ),
          p(link("https://fred.stlouisfed.org/", "FRED — economic data")),
        ]),
      },
      {
        title: "Incentives",
        summary:
          "People respond to what they are rewarded for, including the rewards you did not mean to create.",
        text: note([
          p(
            t(
              "An incentive is any change in the payoff to an action. Wages, fines, grades, status, the risk of getting caught — they all count. The interesting cases are the ones where the measured target is not the thing you wanted: hospitals gaming a wait-time metric, teachers teaching to the test, a bounty that produces more of the pest you were trying to kill.",
            ),
          ),
          p(
            t(
              "Good design asks what a reasonable person would do if this were the scoreboard. If the answer is ugly, the scoreboard is the policy, not the speech that came with it.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Principal–agent problems: when the person deciding is not the person bearing the cost",
            "Unintended consequences as the default, not a footnote",
            "Moral hazard and adverse selection — two ways hidden information warps a deal",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.econlib.org/library/Enc/Incentives.html",
              "EconLib — Incentives",
            ),
          ),
          p(
            link(
              "https://freakonomics.com/podcast/",
              "Freakonomics Radio — incentives in the wild",
            ),
          ),
        ]),
      },
      {
        title: "Comparative advantage",
        summary:
          "Trade pays when each side specializes in what they give up the least to make.",
        text: note([
          p(
            t(
              "Absolute advantage is being better at something. Comparative advantage is being less bad at it relative to your alternatives. A surgeon who types faster than the receptionist should still not type letters all day: the opportunity cost of an hour of surgery is higher. Countries work the same way, even when one is more productive at everything.",
            ),
          ),
          p(
            t(
              "The gains from trade are not a promise that nobody is hurt in the transition. They are a claim that the pie can be larger, and that blocking trade to protect one job has a cost paid by everyone who would have bought the cheaper good — including other workers.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Ricardo’s point, and what it leaves out: capital mobility, politics, adjustment costs",
            "Why “we should make everything at home” fails the opportunity-cost test",
            "Distribution: larger pie, concentrated losses, and why that politics is hard",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://mru.org/courses/principles-economics-microeconomics/comparative-advantage-definition-opportunity-cost",
              "MRU — Comparative advantage",
            ),
          ),
          p(
            link(
              "https://ourworldindata.org/trade-and-globalization",
              "Our World in Data — Trade and globalization",
            ),
          ),
        ]),
      },
      {
        title: "Inflation",
        summary:
          "A rising price level is a story about money, expectations, and too much spending chasing too few goods.",
        text: note([
          p(
            t(
              "One price going up is a relative-price change. Inflation is when the measuring stick itself stretches: money buys less across a wide basket. Causes cluster into demand running hot, supply shrinking, and people expecting more of the same so they raise prices and wages in advance.",
            ),
          ),
          p(
            t(
              "The harm is not only “things cost more.” It is the noise: contracts written in nominal terms, savings silently taxed, and the difficulty of telling a real signal (this sector is scarce) from a general rise. Hyperinflation is that problem at a scale that wrecks planning altogether.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "CPI vs core vs PCE — what a price index includes, and what it hides",
            "The quantity of money, interest rates, and what a central bank can actually pin down",
            "Inflation vs unemployment: the Phillips curve as history, not a law",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.bankofengland.co.uk/explainers/what-is-inflation",
              "Bank of England — What is inflation?",
            ),
          ),
          p(
            link(
              "https://www.federalreserve.gov/faqs/economy_14419.htm",
              "Federal Reserve — What is inflation?",
            ),
          ),
        ]),
      },
    ],
    edges: [
      ["Thinking like an economist", "Opportunity cost"],
      ["Thinking like an economist", "Supply and demand"],
      ["Thinking like an economist", "Incentives"],
      ["Opportunity cost", "Comparative advantage"],
      ["Incentives", "Comparative advantage"],
      ["Supply and demand", "Inflation"],
    ],
  },
  {
    name: "Historical thinking",
    notes: "How to read the past: sources, causes, and the stories we tell about them.",
    nodes: [
      {
        title: "Historical thinking",
        summary:
          "The past is not a list of dates. It is an argument built from incomplete evidence.",
        text: note([
          p(
            t(
              "History is a craft: you ask a question, you gather what survives, you notice what does not, and you make a claim that could be wrong. Chronology is the skeleton. The work is causation, context, and the gap between what people said they were doing and what their situation allowed.",
            ),
          ),
          p(
            t(
              "Presentism is the cheap error — judging a century by this morning’s morals without asking what choices were actually on the table. The opposite error is treating the past as sealed off, as if nothing in it still structures the world you live in.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Continuity vs change: what actually turned, and what only changed costume",
            "Structure and agency — systems constrain, people still decide",
            "Whose archive? Silence in the record is evidence too",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://sheg.stanford.edu/history-lessons",
              "Stanford History Education Group — History Lessons",
            ),
          ),
          p(
            link(
              "https://www.historians.org/perspectives-article/what-does-it-mean-to-think-historically-january-2007/",
              "AHA — What does it mean to think historically?",
            ),
          ),
        ]),
      },
      {
        title: "Primary sources",
        summary:
          "A letter, a ledger, a photograph: evidence from the time, not about the time.",
        text: note([
          p(
            t(
              "A primary source is produced in the moment you are studying — or close enough that it is still a witness, not a later summary. It is biased, partial, and often trying to persuade. That is the point. You read it for what it claims, what it assumes, and what it never bothers to explain because everyone then already knew.",
            ),
          ),
          p(
            t(
              "Sourcing comes before quoting. Who made this, for whom, under what pressure, in what genre? A government report, a diary, a newspaper ad, and a census table are not interchangeable. Secondary sources are the conversation among historians; they are not a substitute for going back to the traces.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Sourcing, contextualization, corroboration — the three moves before you trust a claim",
            "What counts as a source when the people you care about left no writing",
            "Digital archives: abundance is not the same as a representative sample",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.loc.gov/classroom-materials/",
              "Library of Congress — Classroom materials and primary sources",
            ),
          ),
          p(
            link(
              "https://www.archives.gov/education/lessons",
              "US National Archives — DocsTeach / lesson sources",
            ),
          ),
        ]),
      },
      {
        title: "Causation",
        summary:
          "“After” is not “because.” Causes stack, and the loudest one is not always the load-bearing one.",
        text: note([
          p(
            t(
              "A war has a spark and a pile of kindling. Political history loves the spark: an assassination, a telegram, a speech. Social and economic history look at the pile: debt, demography, institutions, climate, the slow shift in who can tax whom. Both can be true. The skill is ranking them for a specific question, not collecting a cloud of “factors.”",
            ),
          ),
          p(
            t(
              "Counterfactuals are how you test a cause: if this had been different, would the outcome still have happened? They are imaginary, but refusing them leaves you with a timeline and no explanation. Contingency is the reminder that some forks were real; determinism is the temptation to write the ending back onto the beginning.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Immediate vs underlying causes — and why textbooks flatten them into a list",
            "Unintended consequences as historical mechanism, not irony",
            "Comparison: two cases, one variable — the closest thing history has to a control",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.worldhistory.org/article/2221/why-the-industrial-revolution-started-in-britain/",
              "World History Encyclopedia — Why the Industrial Revolution started in Britain",
            ),
          ),
          p(
            link(
              "https://ourworldindata.org/",
              "Our World in Data — long-run series as a check on stories",
            ),
          ),
        ]),
      },
      {
        title: "The Industrial Revolution",
        summary:
          "Energy, machines, and new institutions rewired how people worked, lived, and grew in number.",
        text: note([
          p(
            t(
              "Sometime after 1750, a few regions escaped the old pattern in which more people meant poorer people. Coal, steam, mechanized textile production, and later the factory clock changed the energy budget of an economy. The puzzle is not only the inventions. It is why they clustered, why they stuck, and why the gains took so long to show up in ordinary wages.",
            ),
          ),
          p(
            t(
              "The social bill arrived immediately: child labor, urban disease, the destruction of older crafts, a new clock-time discipline. Later came cheaper cloth, longer lives, and a politics organized around industrial classes. “Revolution” is a metaphor for speed relative to agrarian centuries — not a claim that it was clean or complete overnight.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Why Britain first — coal, institutions, science, empire, or some mix",
            "The standard-of-living debate: when did workers actually get richer?",
            "Industry as a global system: cotton, slavery, and markets far from Manchester",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.worldhistory.org/British_Industrial_Revolution/",
              "World History Encyclopedia — British Industrial Revolution",
            ),
          ),
          p(
            link(
              "https://ourworldindata.org/economic-growth",
              "Our World in Data — Economic growth",
            ),
          ),
        ]),
      },
      {
        title: "Trade and exchange",
        summary:
          "Goods, people, and ideas have always moved. Empires and markets are two of the vehicles.",
        text: note([
          p(
            t(
              "No society is a closed box. Grain, metals, textiles, diseases, gods, and techniques cross borders because someone can gain by moving them — or because someone with a ship and a gun can make them move. Silk Roads, monsoon routes, Atlantic triangles, and modern containers are different technologies for the same pressure.",
            ),
          ),
          p(
            t(
              "Exchange is never only commercial. It reorders power: who collects customs, who insures the cargo, whose language becomes the contract, whose epidemic travels with the crew. Reading a trade network is a way to see connection without pretending the connection was equal.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Luxury trade vs bulk trade — what actually changes daily life",
            "Diasporas as infrastructure: trust networks that states did not have to build",
            "Globalization as a recurring wave, not a one-way modern invention",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://en.unesco.org/silkroad/",
              "UNESCO — Silk Roads Programme",
            ),
          ),
          p(
            link(
              "https://www.worldhistory.org/Silk_Road/",
              "World History Encyclopedia — Silk Road",
            ),
          ),
        ]),
      },
      {
        title: "Memory and narrative",
        summary:
          "What a society chooses to remember is a political act, not a storage problem.",
        text: note([
          p(
            t(
              "Collective memory is not a backup of what happened. It is a story that gets retold in schools, monuments, holidays, and family talk until it feels like common sense. Historians work against that grain: they recover lost voices, they split a national myth into competing accounts, they show how a commemorated event was framed after the fact.",
            ),
          ),
          p(
            t(
              "That does not mean “everything is just a story.” Events happened. People died. Archives exist. The argument is over selection and meaning — which plot we put those facts into, and whose suffering the plot is built to explain or to hide.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "National myths: founding stories as glue, and as a way to forget",
            "Monuments and renaming fights as arguments about the present, using the past",
            "Oral history: what memory preserves that paper never caught",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.ushmm.org/learn",
              "US Holocaust Memorial Museum — Learn",
            ),
          ),
          p(
            link(
              "https://www.loc.gov/collections/veterans-history-project-collection/",
              "Library of Congress — Veterans History Project",
            ),
          ),
        ]),
      },
    ],
    edges: [
      ["Historical thinking", "Primary sources"],
      ["Historical thinking", "Causation"],
      ["Historical thinking", "Memory and narrative"],
      ["Primary sources", "The Industrial Revolution"],
      ["Causation", "The Industrial Revolution"],
      ["Causation", "Trade and exchange"],
      ["Trade and exchange", "The Industrial Revolution"],
    ],
  },
  {
    name: "Science",
    notes: "How reliable knowledge is built, plus a few load-bearing ideas about nature.",
    nodes: [
      {
        title: "How science works",
        summary:
          "A method for being wrong in public, then getting less wrong with evidence.",
        text: note([
          p(
            t(
              "Science is not a pile of facts or a personality type. It is a set of social habits: make a claim that could fail, say how you would know, show the work, let strangers try to break it. A theory earns trust by surviving tests it could have failed, and by connecting to other well-tested claims — not by sounding precise.",
            ),
          ),
          p(
            t(
              "The cartoon of “the scientific method” (question, hypothesis, experiment, done) hides the real mess: exploration, failed instruments, arguments over what counts as a result, and slow consensus. Peer review and replication are imperfect filters. They are still better than authority dressed up as certainty.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Hypothesis, model, theory, law — different jobs, not a prestige ladder",
            "Why a result can be statistically significant and still not be true",
            "The difference between frontier science and textbook science",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://undsci.berkeley.edu/article/0_0_0/howscienceworks_01",
              "Understanding Science — How science works (Berkeley)",
            ),
          ),
          p(
            link(
              "https://plato.stanford.edu/entries/scientific-method/",
              "Stanford Encyclopedia of Philosophy — Scientific method",
            ),
          ),
        ]),
      },
      {
        title: "Experiment and evidence",
        summary:
          "A good test isolates one cause, or admits that the world will not let you.",
        text: note([
          p(
            t(
              "An experiment is a question asked of nature under conditions you partly control. Controls are how you stop yourself from crediting the wrong variable. Randomization is how you stop hidden differences from lining up with the treatment. Measurement is a theory of the instrument: what it actually detects, and what it systematically misses.",
            ),
          ),
          p(
            t(
              "Not every field can run a clean trial. Astronomy, geology, and much of evolutionary biology infer from observation, comparison, and models that make risky predictions. That is still evidence. The standard is not a lab coat. It is whether another person could, in principle, be convinced you are wrong.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Confounds, placebos, and blinding — the ways hope leaks into a result",
            "Correlation, causation, and the natural experiments history sometimes hands you",
            "Error bars as the honest part of a claim",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://phet.colorado.edu/",
              "PhET — interactive science simulations",
            ),
          ),
          p(
            link(
              "https://www.khanacademy.org/science/biology/intro-to-biology/science-of-biology/a/science-and-the-scientific-method",
              "Khan Academy — Science and the scientific method",
            ),
          ),
        ]),
      },
      {
        title: "Energy",
        summary:
          "Nothing interesting happens without a flow of energy, and none of it is free.",
        text: note([
          p(
            t(
              "Energy is the currency of change: motion, heat, light, chemical bonds, a charged battery. Conservation says the books balance — energy changes form, it does not appear from nowhere. The second law is the spoiler: every useful conversion leaks heat, and disorder in the universe as a whole does not run backward for free.",
            ),
          ),
          p(
            t(
              "Once you see energy flows, a lot of science collapses into one picture. Food webs are transfers with loss at each step. Climate is an energy budget for a planet. Engines, metabolism, and stars are different machines for turning a gradient into work until the gradient is gone.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Work, heat, and temperature — related, not synonyms",
            "Why “energy never destroyed” does not mean we cannot run out of usable energy",
            "Where biological and industrial energy ultimately come from",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.khanacademy.org/science/physics/work-and-energy",
              "Khan Academy — Work and energy",
            ),
          ),
          p(
            link(
              "https://www.eia.gov/energyexplained/",
              "U.S. EIA — Energy explained",
            ),
          ),
        ]),
      },
      {
        title: "Evolution",
        summary:
          "Heritable variation plus unequal reproductive success is enough to rewrite a lineage.",
        text: note([
          p(
            t(
              "Evolution is change in the inherited makeup of a population. Natural selection is one mechanism: individuals differ, some of those differences are heritable, and some differences change the odds of leaving offspring. Over time the population is no longer a copy of its ancestors. Mutation, drift, and gene flow are the other movers.",
            ),
          ),
          p(
            t(
              "It is not a ladder and it is not a plan. Adaptation is local and opportunistic. Vestiges, bad backs, and the tangled tree of life are what you expect from a process that revises existing parts instead of designing from scratch. The evidence is the nested pattern of traits, the fossils in order, and the DNA that reads like a palimpsest.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Selection, drift, and why small populations wander",
            "Speciation: when a lineage splits and the split holds",
            "What “theory” means here: a framework that organizes a mountain of facts",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.biointeractive.org/classroom-resources/evolution",
              "HHMI BioInteractive — Evolution",
            ),
          ),
          p(
            link(
              "https://evolution.berkeley.edu/evolution-101/",
              "Understanding Evolution — Evolution 101 (Berkeley)",
            ),
          ),
        ]),
      },
      {
        title: "Matter and the atom",
        summary:
          "Everything you can kick is particles in arrangement, and chemistry is the rules of that arrangement.",
        text: note([
          p(
            t(
              "The atomic picture is simple enough to draw and rich enough to run the world: a nucleus, electrons in quantized states, and bonds as shared or transferred charge. Elements differ by proton count. Compounds differ by how those elements lock together. Macroscopic properties — hardness, color, boiling point — are those arrangements, felt at human scale.",
            ),
          ),
          p(
            t(
              "Conservation of mass in a reaction is bookkeeping of atoms. Energy still moves: making and breaking bonds absorbs or releases it. Once the periodic table is a map rather than a poster, a formula stops being a code and starts being a prediction about behavior.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Why the periodic table’s columns behave like families",
            "States of matter as a competition between energy and attraction",
            "From atoms to materials: crystals, polymers, and why steel is not iron",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://www.khanacademy.org/science/chemistry/atomic-structure-and-properties",
              "Khan Academy — Atomic structure and properties",
            ),
          ),
          p(
            link(
              "https://ptable.com/",
              "Ptable — interactive periodic table",
            ),
          ),
        ]),
      },
      {
        title: "Earth systems",
        summary:
          "Atmosphere, ocean, ice, rock, and life are coupled loops, not separate subjects.",
        text: note([
          p(
            t(
              "The planet is a set of reservoirs connected by fluxes: carbon among air, sea, soil, and stone; heat from equator to pole; water through rain, rivers, ice, and vapor. Climate is the long-run statistics of that weather machine. A greenhouse gas changes how much outgoing infrared the atmosphere holds onto. The rest is feedback: ice, clouds, vegetation, ocean circulation.",
            ),
          ),
          p(
            t(
              "Geologic time is the other scale. Continents move, ice ages come and go, extinctions reset the biosphere. Human industry is fast relative to those cycles, which is why a few centuries of fossil carbon can shove a system that usually wanders on millennia. Reading Earth science is learning to keep both clocks in your head at once.",
            ),
          ),
          h2("Open threads"),
          bullets([
            "Forcing vs feedback — what starts a change, and what amplifies it",
            "The carbon cycle: fast biology, slow rock, and the fossil pulse in between",
            "Paleoclimate: how ice cores and sediments tell you the system has done this before, and how it has not",
          ]),
          h2("Starting points"),
          p(
            link(
              "https://climate.nasa.gov/evidence/",
              "NASA — Climate change evidence",
            ),
          ),
          p(
            link(
              "https://www.ipcc.ch/report/ar6/wg1/",
              "IPCC AR6 — The Physical Science Basis",
            ),
          ),
        ]),
      },
    ],
    edges: [
      ["How science works", "Experiment and evidence"],
      ["How science works", "Energy"],
      ["How science works", "Evolution"],
      ["How science works", "Matter and the atom"],
      ["Experiment and evidence", "Earth systems"],
      ["Energy", "Earth systems"],
      ["Evolution", "Earth systems"],
      ["Matter and the atom", "Energy"],
    ],
  },
];

async function seedGraph(spec: SeedGraph): Promise<boolean> {
  const existing = await prisma.graph.findFirst({
    where: { name: spec.name },
  });
  if (existing) {
    const nodeCount = await prisma.node.count({ where: { graphId: existing.id } });
    if (nodeCount > 0) {
      console.log(
        `Seed skipped for "${spec.name}": graph already has ${nodeCount} node(s).`,
      );
      return false;
    }
  }

  const graph =
    existing ??
    (await prisma.graph.create({
      data: { name: spec.name, notes: spec.notes },
    }));

  const ids = new Map<string, string>();
  for (const nodeSpec of spec.nodes) {
    const node = await prisma.node.create({
      data: {
        graphId: graph.id,
        title: nodeSpec.title,
        summary: nodeSpec.summary,
        contents: {
          create: { type: "TEXT", text: nodeSpec.text },
        },
      },
    });
    ids.set(nodeSpec.title, node.id);
  }

  await prisma.edge.createMany({
    data: spec.edges.map(([sourceTitle, targetTitle]) => {
      const sourceNodeId = ids.get(sourceTitle);
      const targetNodeId = ids.get(targetTitle);
      if (!sourceNodeId || !targetNodeId) {
        throw new Error(
          `Seed edge missing node in "${spec.name}": ${sourceTitle} → ${targetTitle}`,
        );
      }
      return { sourceNodeId, targetNodeId, weight: 1 };
    }),
  });

  await prisma.graph.update({
    where: { id: graph.id },
    data: { updatedAt: new Date() },
  });

  console.log(
    `Seeded graph "${graph.name}": ${spec.nodes.length} nodes, ${spec.edges.length} edges.`,
  );
  return true;
}

async function main() {
  let seeded = 0;
  for (const spec of graphs) {
    if (await seedGraph(spec)) seeded += 1;
  }
  if (seeded === 0) {
    console.log("Nothing to seed. Delete graphs (or their nodes) for a fresh start.");
  }
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
