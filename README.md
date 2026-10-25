# AI-Based Toxic Comment Detection Using Automata and SLM

## Windows setup
1. Install Python 3.11 or 3.12 and VS Code.
2. Open this folder in VS Code, then open Terminal > New Terminal.
3. Run `py -3.11 -m venv .venv` (or `py -m venv .venv` if 3.11 is your default).
4. Run `.venv\Scripts\python -m pip install -r requirements.txt`.
5. Run `.venv\Scripts\python app.py`.
6. Open http://127.0.0.1:5000/.

First run downloads a pretrained Toxic-BERT model and needs internet access. The model is a compact BERT-based toxicity classifier, not a generative SLM. Its independent label probabilities are not a calibrated overall toxicity confidence. The final hybrid rule is an educational heuristic. Do not deploy this as the sole basis for moderation decisions.

## FLA contribution
`KeywordAutomaton` builds a trie of keyword prefixes with failure transitions (Aho-Corasick). Each state represents a prefix. Output states mark matched patterns. The transition process runs in linear time with respect to comment length plus matches, after preprocessing. Word boundaries are checked to reduce accidental substring matches.

## Testing
Try: `Hello, how are you?`, `You are stupid`, `I disagree with that idea`, `Shut up`, `You did a great job!`.

## Limitations
Context, quoting, sarcasm, reclaimed words, and dialect variation can lead to errors. The English model is not intended for all languages. Add a labeled test dataset and report precision, recall, and F1 before claiming performance.
