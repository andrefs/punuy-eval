# punuy-eval

[![Node.js CI](https://github.com/andrefs/punuy-eval/actions/workflows/node.js.yml/badge.svg)](https://github.com/andrefs/punuy-eval/actions/workflows/node.js.yml)

Evaluate LLMs capability of assessing semantic relations

## Installing

1. Run `npm install`
1. Copy `.env.example` to `.env` and edit your API keys.

## Running

Using the `run-exp` script will run an experiment and store the results on a subfolder of `./results/`.

Example:

```bash
src/scripts/run-exp src/scripts/dsSampleFromDsSample.ts 10
```

## Bugs and stuff

Open a [GitHub issue](https://github.com/andrefs/punuy-eval/issues) or, preferably, send me a [pull request](https://github.com/andrefs/punuy-eval/pulls).

## License

The MIT License (MIT)

Copyright (c) 2019 André Santos <andrefs@andrefs.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
