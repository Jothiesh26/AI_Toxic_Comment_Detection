import re
from collections import deque
from functools import lru_cache
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
# Demo vocabulary only; expand and evaluate for your use case.
PATTERNS = ('idiot', 'stupid', 'shut up', 'moron', 'loser')
MODEL_NAME = 'unitary/toxic-bert'

class KeywordAutomaton:
    """Aho-Corasick DFA with failure links for multi-pattern matching."""
    def __init__(self, patterns):
        self.next = [{}]
        self.fail = [0]
        self.out = [set()]
        for pattern in patterns:
            state = 0
            for char in pattern:
                if char not in self.next[state]:
                    self.next[state][char] = len(self.next)
                    self.next.append({})
                    self.fail.append(0)
                    self.out.append(set())
                state = self.next[state][char]
            self.out[state].add(pattern)
        queue = deque(self.next[0].values())
        while queue:
            state = queue.popleft()
            for char, target in self.next[state].items():
                queue.append(target)
                f = self.fail[state]
                while f and char not in self.next[f]:
                    f = self.fail[f]
                self.fail[target] = self.next[f].get(char, 0)
                self.out[target].update(self.out[self.fail[target]])

    def match(self, text):
        state = 0
        matches = set()
        for i, char in enumerate(text):
            while state and char not in self.next[state]:
                state = self.fail[state]
            state = self.next[state].get(char, 0)
            for pattern in self.out[state]:
                start = i - len(pattern) + 1
                end = i + 1
                if (start == 0 or not text[start-1].isalnum()) and (end == len(text) or not text[end].isalnum()):
                    matches.add(pattern)
        return sorted(matches)

automaton = KeywordAutomaton(PATTERNS)

@lru_cache(maxsize=1)
def load_model():
    from transformers import pipeline
    return pipeline('text-classification', model=MODEL_NAME, tokenizer=MODEL_NAME, top_k=None, device=-1)

def predict(text):
    scores = load_model()(text[:4000], truncation=True, max_length=512)[0]
    probabilities = {entry['label'].lower(): float(entry['score']) for entry in scores}
    # Toxic-BERT uses multiple independent labels; choose the highest probability.
    return max(probabilities.values()), probabilities

@app.route('/')
def index():
    return render_template('index.html')

@app.post('/analyze')
def analyze():
    data = request.get_json(silent=True) or {}
    text = str(data.get('comment', '')).strip()
    if not text or len(text) > 2000:
        return jsonify(error='Enter a comment of 1 to 2000 characters.'), 400
    matches = automaton.match(text.lower())
    try:
        ai_score, labels = predict(text)
    except Exception as exc:
        app.logger.exception('Model unavailable')
        return jsonify(error='AI model could not load. Check internet access on first run and installed packages.'), 503
    # Heuristic hybrid decision, not a calibrated probability.
    toxic = bool(matches) or ai_score >= 0.5
    return jsonify(classification='Toxic' if toxic else 'Non-Toxic',
                   ai_score=round(ai_score, 4),
                   matched_keywords=matches,
                   automata_states=len(automaton.next),
                   model_labels={k: round(v, 4) for k, v in labels.items()},
                   method='DFA keyword match or AI score >= 0.5')

if __name__ == '__main__':
    app.run(debug=True)
