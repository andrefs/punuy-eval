import { name } from ".";
import { ExpVars, Prompt, PromptGenerator } from "..";
import { shuffle } from "fast-shuffle";

const prompts: PromptGenerator[] = [
  {
    id: "sim-simplest-en",
    language: "en" as const,
    type: "similarity" as const,
    text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where 1 means very little similarity and 5 means very similar.\n\nPairs of words:\n",
  },
  {
    id: "sim-simpleScale-en",
    language: "en" as const,
    type: "similarity" as const,
    text: "Indicate how strongly the words in each pair are similar in meaning using integers from 1 to 5, where the scale means: 1 - not at all similar, 2 - vaguely similar, 3 - indirectly similar, 4 - strongly similar, 5 - inseparably similar.\n\nPairs of words:\n",
  },
  {
    id: "sim-adaptedWs353-en",
    language: "en" as const,
    type: "similarity" as const,
    text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic similarity of various words in the English language. The purpose of this experiment is to assign semantic similarity scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical similarity score between 1 and 5 (1 = words are totally dissimilar, 5 = words are VERY closely similar). By definition, the similarity of the word to itself should be 5. You may assign fractional scores (for example, 3.5). When estimating similarity of antonyms, consider them "dissimilar" rather than "similar". Thank you for your assistance!\n\nPairs of words:\n',
  },
  {
    id: "rel-simplest-en",
    language: "en" as const,
    type: "relatedness" as const,
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where 1 means very unrelated and 5 means very related.\n\nPairs of words:\n",
  },
  {
    id: "rel-simpleScale-en",
    language: "en" as const,
    type: "relatedness" as const,
    text: "Indicate how strongly the words in each pair are related in meaning using integers from 1 to 5, where the scale means: 1 - not at all related, 2 - vaguely related, 3 - indirectly related, 4 - strongly related, 5 - inseparably related.\n\nPairs of words:\n",
  },
  {
    id: "rel-adaptedWs353-en",
    language: "en" as const,
    type: "relatedness" as const,
    text: 'Hello, we kindly ask you to assist us in a psycholinguistic experiment, aimed at estimating the semantic relatedness of various words in the English language. The purpose of this experiment is to assign semantic relatedness scores to pairs of words, so that machine learning algorithms can be subsequently trained and adjusted using human-assigned scores. Below is a list of pairs of words. For each pair, please assign a numerical relatedness score between 1 and 5 (1 = words are totally unrelated, 5 = words are VERY closely related). By definition, the relatedness of the word to itself should be 5. You may assign fractional scores (for example, 3.5).  When estimating relatedness of antonyms, consider them "related" (i.e., belonging to the same domain or representing features of the same concept), rather than "unrelated". Thank you for your assistance!\n\nPairs of words:\n',
  },
  {
    id: "sim-simlex999-en",
    language: "en" as const,
    type: "similarity" as const,
    text: "Two words are synonyms if they have very similar meanings. Synonyms represent the same type or category of thing. Here are some examples of synonym pairs: cup/mug, glasses/spectacles, envy/jealousy. In practice, word pairs that are not exactly synonymous may still be very similar. Here are some very similar pairs - we could say they are nearly synonyms: alligator/crocodile, love / affection, frog/toad. In contrast, although the following word pairs are related, they are not very similar. The words represent entirely different types of thing:car/tyre, car/motorway, car/crash. In this survey, you are asked to compare word pairs and to rate how similar they are by assigning a numeric value between 1 (very dissimilar) and 5 (very similar). Remember, things that are related are not necessarily similar. If you are ever unsure, think back to the examples of synonymous pairs (glasses/spectacles), and consider how close the words are (or are not) to being synonymous. There is no right answer to these questions. It is perfectly reasonable to use your intuition or gut feeling as a native English speaker, especially when you are asked to rate word pairs that you think are not similar at all.\n\nPairs of words:\n",
  },
  {
    id: "rel-afs-survey-pt",
    language: "pt" as const,
    type: "relatedness" as const,
    text: "Neste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade do relacionamento semântico entre pares de palavras afetivas. Por favor, antes de começar, leia atentamente a instrução e exemplos abaixo.\n\nA pergunta que lhe fazemos é: quão relacionadas estão as duas palavras? Pares de palavras pouco relacionadas deverão ser pontuados com valores mais baixos, e pares de palavras muito relacionadas com valores mais altos. Repare que palavras opostas apresentam frequentemente valores de relacionamento elevados.\n\nPor exemplo, as palavras modesto e esperto parecem pouco relacionadas. Já dissimular e disfarçar parecem muito relacionadas. Confiante está muito relacionado consigo mesmo. Enquanto que violento e pacífico, sendo palavras opostas, são frequentemente relacionadas, tal como alegria e tristeza.\nExemplos:\n* modesto, esperto: 1\n*dissimular, disfarçar: 4\n*confiante, confiante: 5\n* violento, pacífico: 4\n* alegria, tristeza: 5\n\nPor favor avalie o relacionamento semântico de cada par de palavras:",
  },
  {
    id: "sim-afs-survey-pt",
    language: "pt" as const,
    type: "similarity" as const,
    text: "Neste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade da semelhança semântica entre pares de palavras afetivas. Por favor, antes de começar, leia atentamente a instrução e exemplos abaixo.\n\nA pergunta que lhe fazemos é: quão semelhantes são as duas palavras? Pares de palavras pouco similares deverão ser pontuados com valores mais baixos, e pares de palavras muito similares com valores mais altos.\n\nPor exemplo, as palavras esperto e inteligente partilham muitas semelhanças, tal como alegria e felicidade. Confiante partilha muitas semelhanças consigo mesmo. Feliz e louco partilham algumas semelhanças. Já triste e divertido não são nada semelhantes.\nExemplos:\n*esperto, inteligente: 4\n* alegria, felicidade: 5\n* confiante, confiante: 5\n* feliz, louco: 3\n* triste, divertido: 1\n\nPor favor avalie a semelhança semântica de cada par de palavras:",
  },
  {
    id: "sim-simplest-pt",
    language: "pt" as const,
    type: "similarity" as const,
    text: "Indique quão semelhante é o significado das palavras de cada par usando números inteiros de 1 a 5, em que 1 indica nenhuma semelhança e 5 indica total semelhança.\n\nPares de palavras:\n",
  },
  {
    id: "sim-simpleScale-pt",
    language: "pt" as const,
    type: "similarity" as const,
    text: "Indique quão semelhante é o significado das palavras de cada par usando números inteiros de 1 a 5, em que a escala significa: 1 - nenhuma semelhança,  2 - pouca semelhança, 3 - alguma semelhança, 4 - muita semelhança, 5 - total semelhança.\n\nPa de palavras:\n",
  },
  {
    id: "rel-simplest-pt",
    language: "pt" as const,
    type: "relatedness" as const,
    text: "Indique quão relacionado está o significado das palavras de cada par usando números inteiros de 1 a 5, em que 1 indica nenhum relacionamento e 5 indica total relacionamento.\n\nPares de palavras:\n",
  },
  {
    id: "rel-simpleScale-pt",
    language: "pt" as const,
    type: "relatedness" as const,
    text: "Indique quão relacionado está o significado das palavras de cada par usando números inteiros de 1 a 5, em que a escala significa: 1 - nenhum relacionamento,  2 - pouco relacionamento, 3 - algum relacionamento, 4 - muito relacionamento, 5 - relacionamento total.\n\nPares de palavras:\n",
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
