import { name } from ".";
import { ExpVars, Prompt, PromptGenerator } from "..";
import { shuffle } from "fast-shuffle";

const prompts: PromptGenerator[] = [
  {
    id: "sim-simplest",
    language: "en" as const,
    type: "similarity" as const,
    text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where 1 means very little similarity and 5 means very similar.\n\nPairs of words:\n",
  },
  //{
  //  id: "sim-simpleScale",
  //  language: "en" as const,
  //  type: "similarity" as const,
  //  text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where the scale means: 1 - not at all similar, 2 - vaguely similar, 3 - indirectly similar, 4 - strongly similar, 5 - inseparably similar.\n\nPairs of words:\n",
  //},
  //{
  //  id: "sim-adaptedWs353",
  //  language: "en" as const,
  //  type: "similarity" as const,
  //  text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic similarity of various words in the English language. The purpose of this experiment is to assign semantic similarity scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical similarity score between 1 and 5 (1 = words are totally dissimilar, 5 = words are VERY closely similar). By definition, the similarity of the word to itself should be 5. You may assign fractional scores (for example, 3.5). When estimating similarity of antonyms, consider them "dissimilar" rather than "similar". Thank you for your assistance!\n\nPairs of words:\n',
  //},
  //{
  //  id: "rel-simplest",
  //  language: "en" as const,
  //  type: "relatedness" as const,
  //  text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where 1 means very unrelated and 5 means very related.\n\nPairs of words:\n",
  //},
  //{
  //  id: "rel-simpleScale",
  //  language: "en" as const,
  //  type: "relatedness" as const,
  //  text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where the scale means: 1 - not at all related, 2 - vaguely related, 3 - indirectly related, 4 - strongly related, 5 - inseparably related.\n\nPairs of words:\n",
  //},
  //{
  //  id: "rel-adaptedWs353",
  //  language: "en" as const,
  //  type: "relatedness" as const,
  //  text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic relatedness of various words in the English language. The purpose of this experiment is to assign semantic relatedness scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical relatedness score between 1 and 5 (1 = words are totally unrelated, 5 = words are VERY closely related). By definition, the relatedness of the word to itself should be 5. You may assign fractional scores (for example, 3.5).  When estimating relatedness of antonyms, consider them "related" (i.e., belonging to the same domain or representing features of the same concept), rather than "unrelated". Thank you for your assistance!\n\nPairs of words:\n',
  //},
  //{
  //  id: "sim-simlex999",
  //  language: "en" as const,
  //  type: "similarity" as const,
  //  text: "Two words are synonyms if they have very similar meanings. Synonyms represent the same type or category of thing. Here are some examples of synonym pairs: cup/mug, glasses/spectacles, envy/jealousy. In practice, word pairs that are not exactly synonymous may still be very similar. Here are some very similar pairs - we could say they are nearly synonyms: alligator/crocodile, love / affection, frog/toad. In contrast, although the following word pairs are related, they are not very similar. The words represent entirely different types of thing:car/tyre, car/motorway, car/crash. In this survey, you are asked to compare word pairs and to rate how similar they are by assigning a numeric value between 1 (very dissimilar) and 5 (very similar). Remember, things that are related are not necessarily similar. If you are ever unsure, think back to the examples of synonymous pairs (glasses/spectacles), and consider how close the words are (or are not) to being synonymous. There is no right answer to these questions. It is perfectly reasonable to use your intuition or gut feeling as a native English speaker, especially when you are asked to rate word pairs that you think are not similar at all.\n\nPairs of words:\n"
  //},
  {
    id: "rel-afs-survey",
    language: "pt" as const,
    type: "relatedness" as const,
    text: "Nas próximas secções deste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade do relacionamento semântico entre pares de palavras afetivas.\n\nPares de palavras pouco semelhantes deverão ser pontuados com valores mais baixos, e pares de palavras muito semelhantes com valores mais altos.\nExemplos:\nesperto, inteligente: 4\nfeliz, louco: 3\ntriste, divertido: 1\nconfiante, confiante: 5\nPor favor avalie a similaridade semântica de cada par de palavras:",
  },
  {
    id: "sim-afs-survey",
    language: "pt" as const,
    type: "similarity" as const,
    text: "Nas próximas secções deste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade da semelhança semântica entre pares de palavras afetivas.\n\nPares de palavras pouco relacionadas deverão ser pontuados com valores mais baixos, e pares de palavras muito relacionadas com valores mais altos. Repare que palavras opostas apresentam frequentemente valores de relacionamento elevados.\nExemplos:\nmodesto, fino: 1\ndissimular, disfarçar: 4\ndesconfiado, desconfiado: 5\nviolento, pacífico: 4\n\nPor favor avalie o relacionamento semântico de cada par de palavras:",
  },
].map(p => ({
  ...p,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const pairs = shuffle(vars.dataset.partitions[0].data)
      .slice(0, 100)
      .map(({ term1, term2 }) => [term1, term2] as [string, string]);

    return {
      ...p,
      id: `${name}-${p.id}`,
      pairs,
      text:
        p.text + pairs.map(([term1, term2]) => `${term1}, ${term2}`).join("\n"),
    };
  },
}));

export default prompts;
