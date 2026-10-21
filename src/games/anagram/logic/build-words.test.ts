// Builds data/words.json, the answer and accepted word lists the app ships (4, 5 and 6 letters), from SCOWL (Spell Checker Oriented Word Lists).
// Not a check: skipped in the gate, like Make 24's build-puzzles.test.ts. The output is deterministic (sorted), so the lists can be rebuilt exactly.
// SCOWL release 2020.12.07, a public read-only download. PowerShell, from the repo root:
//
//   1. Download and unpack it outside the repo (tar prints errors for the speller/ symlinks; final/ unpacks fine):
//        $dir = '<temp folder>'
//        Invoke-WebRequest -Uri 'https://sourceforge.net/projects/wordlist/files/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz/download' -OutFile "$dir\scowl.tar.gz" -UserAgent 'curl/8.0'
//        tar -xzf "$dir\scowl.tar.gz" -C $dir
//   2. Build (the env var is SCOWL's final folder):
//        $env:ANAGRAM_BUILD = "$dir\scowl-2020.12.07\final"
//        npx.cmd jest src/games/anagram/logic/build-words.test.ts
//        Remove-Item Env:ANAGRAM_BUILD
// The project has no @types/node, so the fs calls used here are typed by hand. Paths are relative to the repo root.
const fs = jest.requireActual<{
  mkdirSync(path: string, options: { recursive: boolean }): void;
  writeFileSync(path: string, data: string): void;
  readFileSync(path: string, encoding: 'utf8' | 'latin1'): string;
  readdirSync(path: string): string[];
}>('fs');
const OUT_DIR = 'src/games/anagram/data';
// Highest SCOWL size level included (levels: 10 20 35 40 50 55 60 70 80 95). Tuned by sampling the lists;
// keep the counts in words-data.test.ts in step.
const ANSWER_MAX = 35;
const ACCEPTED_MAX = 80;
const SIZES = [10, 20, 35, 40, 50, 55, 60, 70, 80, 95];
const ANSWER_CATEGORIES = ['english', 'american']; // US spelling only
const ACCEPTED_CATEGORIES = ['english', 'american', 'british', 'canadian', 'australian', 'variant_1'];
const LENGTHS = [4, 5, 6];
const WORD = /^[a-z]+$/;

const build = process.env.ANAGRAM_BUILD ? describe : describe.skip;

build('build the anagram word lists', () => {
  it('writes data/words.json', () => {
    const dir = process.env.ANAGRAM_BUILD!;
    const files = fs.readdirSync(dir);
    // SCOWL's final/ files are per level, not cumulative: the words of every level up to max are the union of the files.
    const load = (categories: string[], max: number): Set<string> => {
      const out = new Set<string>();
      for (const c of categories) {
        for (const size of SIZES.filter((s) => s <= max)) {
          const name = `${c}-words.${size}`;
          if (!files.includes(name)) continue;
          for (const line of fs.readFileSync(`${dir}/${name}`, 'latin1').split(/\r?\n/)) out.add(line);
        }
      }
      return out;
    };
    const ofLength = (words: Iterable<string>, n: number) => [...words].filter((w) => w.length === n && WORD.test(w));

    const wordsIn = (file: string) =>
      new Set(
        fs
          .readFileSync(`${OUT_DIR}/${file}`, 'utf8')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line !== '' && !line.startsWith('#')),
      );
    const excluded = wordsIn('excluded.txt');
    const keep = wordsIn('keep.txt');

    // Regular plurals, past tenses and other inflections: dropped when the stem (any length) is a word of the same
    // answer set. Plain -er/-est are not tried (they hit base words like corner or forest), only the e-drop.
    const undoubled = (s: string) => (/([^aeiou])\1$/.test(s) ? s.slice(0, -1) : false);
    const derivedFrom = (w: string, stems: Set<string>): string | null => {
      if (keep.has(w)) return null;
      const tries = [
        // plurals and past tenses: any stem length
        w.endsWith('s') && w.slice(0, -1),
        w.endsWith('es') && w.slice(0, -2),
        w.endsWith('ies') && `${w.slice(0, -3)}y`,
        w.endsWith('ed') && w.slice(0, -2),
        w.endsWith('d') && w.slice(0, -1).endsWith('e') && w.slice(0, -1),
        w.endsWith('ied') && `${w.slice(0, -3)}y`,
        // other inflections: stems of 3+ letters (a 2-letter stem like be, we, re would drop being, west, ring)
        w.endsWith('ing') && w.slice(0, -3),
        w.endsWith('ing') && `${w.slice(0, -3)}e`,
        w.endsWith('ing') && undoubled(w.slice(0, -3)),
        w.endsWith('ed') && undoubled(w.slice(0, -2)),
        w.endsWith('ier') && `${w.slice(0, -3)}y`,
        w.endsWith('iest') && `${w.slice(0, -4)}y`,
        w.endsWith('er') && w.slice(0, -1),
        w.endsWith('est') && w.slice(0, -2),
      ];
      const OTHER = 6; // index of the first "other inflections" entry
      return (
        tries.find((stem, i): stem is string => !!stem && stem.length >= (i < OTHER ? 1 : 3) && stems.has(stem)) ?? null
      );
    };

    const answersAt = (max: number, n: number) => {
      const stems = load(ANSWER_CATEGORIES, max);
      const dropped: string[] = [];
      const answers = ofLength(stems, n).filter((w) => {
        if (excluded.has(w)) return false;
        const stem = derivedFrom(w, stems);
        if (stem) dropped.push(`${w} <- ${stem}`);
        return !stem;
      });
      return { answers: answers.sort(), dropped: dropped.sort() };
    };
    const acceptedAt = (max: number, n: number) => ofLength(load(ACCEPTED_CATEGORIES, max), n);

    console.log(
      SIZES.map(
        (s) =>
          `size ${s}: ` +
          LENGTHS.map(
            (n) => `${n} letters ${answersAt(s, n).answers.length} answers/${acceptedAt(s, n).length} accepted`,
          ).join(', '),
      ).join('\n'),
    );

    const out: Record<number, { answers: string[]; accepted: string[] }> = {};
    for (const n of LENGTHS) {
      const { answers, dropped } = answersAt(ANSWER_MAX, n);
      const accepted = [...new Set([...acceptedAt(ACCEPTED_MAX, n), ...answers])].sort();
      out[n] = { answers, accepted };
      console.log(
        `${n} letters: ANSWER_MAX ${ANSWER_MAX}, ACCEPTED_MAX ${ACCEPTED_MAX}: ${answers.length} answers, ${accepted.length} accepted`,
      );
      console.log(`dropped as plural/past/inflection, ${n} letters (${dropped.length}):\n${dropped.join('\n')}`);
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(`${OUT_DIR}/words.json`, JSON.stringify(out));
  });
});
