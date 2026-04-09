import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { executeCode, getPistonRuntimes } from '../api/interviewService';

// Default code stubs per language
const STUBS = {
  python:     '# Write your solution here\ndef solution():\n    pass\n',
  javascript: '// Write your solution here\nfunction solution() {\n\n}\n',
  java:       'public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  gcc:        '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  csharp:     'using System;\n\nclass Solution {\n    static void Main() {\n        // Write your solution here\n    }\n}\n',
  go:         'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println()\n}\n',
  rust:       'fn main() {\n    // Write your solution here\n}\n',
  typescript: '// Write your solution here\nfunction solution(): void {\n\n}\n',
};

const MONACO_LANG_MAP = {
  python: 'python', javascript: 'javascript', java: 'java',
  gcc: 'cpp', csharp: 'csharp', go: 'go', rust: 'rust', typescript: 'typescript',
};

// Languages shown in the dropdown
const FEATURED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'gcc', 'csharp', 'go', 'rust'];

export default function CodeSandbox({ questionText, onSubmit, onClose }) {
  const [runtimes, setRuntimes]         = useState({}); 
  const [language, setLanguage]         = useState('python');
  const [code, setCode]                 = useState(STUBS['python']);
  const [stdin, setStdin]               = useState('');
  const [output, setOutput]             = useState('');
  const [isRunning, setIsRunning]       = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runError, setRunError]         = useState('');
  const [exitCode, setExitCode]         = useState(null);
  const [showStdin, setShowStdin]       = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    getPistonRuntimes()
      .then((data) => {
        const map = {};
        data.forEach(({ language: lang, version }) => {
          if (FEATURED_LANGUAGES.includes(lang) && !map[lang]) {
            map[lang] = version;
          }
        });
        setRuntimes(map);
      })
      .catch(() => {
        setRuntimes({
          python: '3.10.0', javascript: '18.15.0', typescript: '5.0.3',
          java: '15.0.2', cpp: '10.2.0', csharp: '6.12.0', go: '1.16.2', rust: '1.50.0',
        });
      });
  }, []);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    setCode(STUBS[lang] || '// Write your solution here\n');
    setOutput('');
    setRunError('');
    setExitCode(null);
  };

  const handleRun = useCallback(async () => {
    const version = runtimes[language];
    if (!version) {
      setRunError(`Runtime version for "${language}" not loaded yet.`);
      return;
    }
    setIsRunning(true);
    setOutput('');
    setRunError('');
    setExitCode(null);
    try {
      const result = await executeCode({ language, version, code, stdin });
      setExitCode(result.exit_code);
      if (result.compile_output) {
        setRunError(result.compile_output);
      }
      if (result.stderr && !result.stdout) {
        setRunError((prev) => prev + '\n' + result.stderr);
      } else {
        setOutput(result.stdout || '(no output)');
        if (result.stderr) setRunError(result.stderr);
      }
    } catch (err) {
      setRunError(err.message);
    } finally {
      setIsRunning(false);
    }
  }, [language, code, stdin, runtimes]);

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return;
    setIsSubmitting(true);
    let finalOutput = output;
    if (!finalOutput) {
      const version = runtimes[language];
      if (version) {
        try {
          const result = await executeCode({ language, version, code, stdin });
          finalOutput = result.stdout || result.stderr || '(no output)';
          setOutput(finalOutput);
          setExitCode(result.exit_code);
        } catch (_) {}
      }
    }
    onSubmit(code, finalOutput, language);
    setIsSubmitting(false);
  }, [code, output, language, stdin, runtimes, onSubmit]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRun]);

  const outputIsError = !!runError || (exitCode !== null && exitCode !== 0);

  return (
    <div style={styles.wrapper}>

      {/*  Header  */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>{'</>'}</span>
          <span style={styles.headerTitle}>Code Challenge</span>
        </div>
        <div style={styles.headerRight}>
          <select style={styles.langSelect} value={language} onChange={handleLanguageChange}>
            {FEATURED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
          {onClose && (
            <button style={styles.closeBtn} onClick={onClose} title="Close sandbox">✕</button>
          )}
        </div>
      </div>

      {/* Question banner */}
      {questionText && (
        <div style={styles.questionBanner}>
          <span style={styles.questionLabel}>Q</span>
          <span style={styles.questionText}>{questionText}</span>
        </div>
      )}

      {/* Editor */}
      <div style={styles.editorWrapper}>
        <Editor
          height="100%"
          language={MONACO_LANG_MAP[language] || language}
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={(editor) => { editorRef.current = editor; }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
            tabSize: 4,
            wordWrap: 'on',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* Stdin toggle */}
      <div style={styles.stdinRow}>
        <button
          style={styles.stdinToggle}
          onClick={() => setShowStdin((v) => !v)}
        >
          {showStdin ? '▾' : '▸'} stdin input
        </button>
      </div>
      {showStdin && (
        <textarea
          style={styles.stdinArea}
          placeholder="Paste any stdin your program needs..."
          value={stdin}
          onChange={(e) => setStdin(e.target.value)}
          rows={3}
        />
      )}

      {/* Output Pane */}
      <div style={styles.outputPane}>
        <div style={styles.outputHeader}>
          <span style={styles.outputLabel}>Output</span>
          {exitCode !== null && (
            <span style={{ ...styles.exitBadge, background: exitCode === 0 ? '#22c55e22' : '#ef444422', color: exitCode === 0 ? '#4ade80' : '#f87171', border: `1px solid ${exitCode === 0 ? '#22c55e44' : '#ef444444'}` }}>
              exit {exitCode}
            </span>
          )}
        </div>
        <pre style={{ ...styles.outputText, color: outputIsError ? '#f87171' : '#e2e8f0' }}>
          {runError || output || (isRunning ? 'Running...' : '// Press Run or Ctrl+Enter')}
        </pre>
      </div>

      {/* Run and Submit buttons */}
      <div style={styles.actionBar}>
        <button
          style={{ ...styles.actionBtn, ...styles.runBtn }}
          onClick={handleRun}
          disabled={isRunning || isSubmitting}
        >
          {isRunning ? (
            <><span style={styles.spinner} /> Running...</>
          ) : (
            <> ▶ Run  <kbd style={styles.kbd}>⌘↵</kbd></>
          )}
        </button>
        <button
          style={{ ...styles.actionBtn, ...styles.submitBtn }}
          onClick={handleSubmit}
          disabled={isRunning || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : '✓ Submit Answer'}
        </button>
      </div>
    </div>
  );
}

// styles
const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0d1117',
    color: '#e2e8f0',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid #21262d',
    background: '#161b22',
    flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  headerIcon:  { fontSize: '14px', color: '#58a6ff', fontWeight: 700, fontFamily: 'monospace' },
  headerTitle: { fontSize: '13px', fontWeight: 600, color: '#c9d1d9', letterSpacing: '0.02em' },
  langSelect: {
    background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d',
    borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', outline: 'none',
  },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#6e7681',
    cursor: 'pointer', fontSize: '14px', padding: '2px 6px', borderRadius: '4px',
    transition: 'color 0.15s',
  },
  questionBanner: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    padding: '10px 14px',
    background: '#0d1b2e',
    borderBottom: '1px solid #1c2d40',
    flexShrink: 0,
  },
  questionLabel: {
    background: '#1f6feb', color: 'white', borderRadius: '4px',
    padding: '1px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '1px',
  },
  questionText: { fontSize: '12.5px', color: '#a8c1e0', lineHeight: 1.5 },
  editorWrapper: { flex: 1, overflow: 'hidden', minHeight: 0 },
  stdinRow: {
    padding: '4px 14px 0',
    background: '#0d1117',
    flexShrink: 0,
  },
  stdinToggle: {
    background: 'none', border: 'none', color: '#6e7681',
    fontSize: '11px', cursor: 'pointer', padding: '2px 0',
  },
  stdinArea: {
    width: '100%', boxSizing: 'border-box',
    background: '#161b22', color: '#c9d1d9',
    border: 'none', borderTop: '1px solid #21262d',
    padding: '8px 14px', fontSize: '12px', fontFamily: 'monospace',
    resize: 'none', outline: 'none', flexShrink: 0,
  },
  outputPane: {
    flexShrink: 0,
    borderTop: '1px solid #21262d',
    background: '#010409',
    maxHeight: '140px',
    overflow: 'auto',
  },
  outputHeader: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '6px 14px 0',
  },
  outputLabel: { fontSize: '11px', fontWeight: 600, color: '#6e7681', textTransform: 'uppercase', letterSpacing: '0.06em' },
  exitBadge: {
    fontSize: '10px', borderRadius: '4px', padding: '1px 6px', fontFamily: 'monospace',
  },
  outputText: {
    margin: 0, padding: '6px 14px 10px',
    fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
  },
  actionBar: {
    display: 'flex', gap: '8px', padding: '10px 14px',
    borderTop: '1px solid #21262d', background: '#161b22',
    flexShrink: 0,
  },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '7px 16px', borderRadius: '6px', border: 'none',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  runBtn:    { background: '#238636', color: 'white' },
  submitBtn: { background: '#1f6feb', color: 'white' },
  spinner: {
    display: 'inline-block', width: '10px', height: '10px',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
    borderRadius: '50%', animation: 'spin 0.6s linear infinite',
  },
  kbd: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '3px', padding: '0 4px', fontSize: '10px', fontFamily: 'monospace',
  },
};
