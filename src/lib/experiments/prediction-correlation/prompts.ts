import { name } from ".";
import { ExpVars, Prompt, PromptGenerator } from "..";
import { shuffle } from "fast-shuffle";

const numberOfPairs = 30;
const prompts: PromptGenerator[] = [
  {
    id: "rel-afs-survey-en",
    language: "en" as const,
    type: "relatedness" as const,
    text: "In this survey you'll be asked to rate quantitatively, on a scale, the intensity of the semantic relatedness between pairs of affective words. Please, before starting, read carefully the instructions and the examples provided.\n\nThe question we're asking is: how much related are the two words? Vaguely related words should be scored with lower values, and strongly related words with higher values. Please note that opposite words frequently present high values of relatedness.\n\nFor example, the words 'modest' and 'smart' don't seem very related. 'Conceal' and 'mask' seem very related. 'Confident' is highly related with itself. 'Violent' and 'pacific', being opposite words, are frequently related, just like 'happiness' and 'sadness'.\nExamples:\n* modest, smart: 1, \n* conceal, mask: 4\n* confident, confident: 5\n* violent, pacific: 4\n* happiness, sadness: 5\n\nPlease rate the semantic relatedness of each pair of words:\n",
  },
  //{
  //  id: "rel-afs-survey-pt",
  //  language: "pt" as const,
  //  type: "relatedness" as const,
  //  text: "Neste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade do relacionamento semântico entre pares de palavras afetivas. Por favor, antes de começar, leia atentamente a instrução e exemplos abaixo.\n\nA pergunta que lhe fazemos é: quão relacionadas estão as duas palavras? Pares de palavras pouco relacionadas deverão ser pontuados com valores mais baixos, e pares de palavras muito relacionadas com valores mais altos. Repare que palavras opostas apresentam frequentemente valores de relacionamento elevados.\n\nPor exemplo, as palavras 'modesto' e 'esperto' parecem pouco relacionadas. Já 'dissimular' e 'disfarçar' parecem muito relacionadas. 'Confiante' está muito relacionado consigo mesmo. Enquanto que 'violento' e 'pacífico', sendo palavras opostas, são frequentemente relacionadas, tal como 'alegria' e 'tristeza'.\nExemplos:\n* modesto, esperto: 1\n* dissimular, disfarçar: 4\n* confiante, confiante: 5\n* violento, pacífico: 4\n* alegria, tristeza: 5\n\nPor favor avalie o relacionamento semântico de cada par de palavras:\n",
  //},
  //{
  //  id: "sim-afs-survey-pt",
  //  language: "pt" as const,
  //  type: "similarity" as const,
  //  text: "Neste questionário ser-lhe-á pedido que avalie quantitativamente, numa escala, a intensidade da semelhança semântica entre pares de palavras afetivas. Por favor, antes de começar, leia atentamente a instrução e exemplos abaixo.\n\nA pergunta que lhe fazemos é: quão semelhantes são as duas palavras? Pares de palavras pouco similares deverão ser pontuados com valores mais baixos, e pares de palavras muito similares com valores mais altos.\n\nPor exemplo, as palavras 'esperto' e 'inteligente' partilham muitas semelhanças, tal como 'alegria' e 'felicidade'. 'Confiante' partilha muitas semelhanças consigo mesmo. 'Feliz' e 'louco' partilham algumas semelhanças. Já 'triste' e 'divertido' não são nada semelhantes.\nExemplos:\n* esperto, inteligente: 4\n* alegria, felicidade: 5\n* confiante, confiante: 5\n* feliz, louco: 3\n* triste, divertido: 1\n\nPor favor avalie a semelhança semântica de cada par de palavras:\n",
  //},
  {
    id: "sim-afs-survey-en",
    language: "en" as const,
    type: "similarity" as const,
    text: "In this survey you'll be asked to rate quantitatively, on a scale, the intensity of the semantic similarity between pairs of affective words. Please, before starting, read carefully the instructions and the examples provided.\n\nThe question we're asking is: how much similar are the two words? Vaguely similar words should be scored with lower values, and strongly similar words with higher values.\n\nFor example, the words 'smart' and 'intelligent' share a lot of similarities, just like 'happiness' and 'joy'. 'Confident' is highly similar to itself. 'Happy' and 'mad' share some similarities. 'Sad' and 'funny' are not similar at all.\nExamples:\n* smart, intelligent: 4, \n* happiness, joy: 5\n* confident, confident: 5\n* happy, mad: 3\n* sad, funny: 1\n\nPlease rate the semantic relatedness of each pair of words:\n",
  },
].map(p => ({
  ...p,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const pairs = shuffle(vars.dpart.data)
      .slice(0, numberOfPairs)
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