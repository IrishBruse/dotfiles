#!/usr/bin/env python3
"""
analyze.py — Codebase Architect skill analysis script.

Usage:
    python3 analyze.py <repo-path> [--max-files 50000] [--include-ext .ts .py .go]

Outputs JSON to stdout matching the schema in references/data-schema.md.
"""

import argparse
import ast
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

SOURCE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py',
    '.go',
    '.rs',
    '.rb',
    '.java',
    '.kt',
    '.swift',
    '.c', '.h', '.cpp', '.cc', '.hpp',
    '.cs',
    '.php',
    '.scala',
    '.ex', '.exs',
    '.clj',
    '.hs',
    '.ml', '.mli',
    '.dart',
    '.vue', '.svelte',
    '.css', '.scss', '.sass', '.less',
    '.html', '.htm',
    '.json', '.yaml', '.yml', '.toml',
    '.sh', '.bash', '.zsh',
    '.sql',
    '.md', '.mdx',
}

SKIP_DIRS = {
    # VCS
    '.git', '.hg', '.svn',
    # JS/TS
    'node_modules', '.pnpm', '.yarn',
    # Python
    '__pycache__', '.mypy_cache', '.pytest_cache', '.ruff_cache',
    '.venv', 'venv', 'env',
    # Build outputs (generic)
    'dist', 'build', 'out', '.next', '.nuxt',
    # C# / .NET — always skip these
    'bin', 'obj',
    # Other
    'target', 'vendor', '.cache', 'coverage', '.nyc_output',
    '.idea', '.vscode',
}

GENERATED_PATTERNS = [
    # JS/CSS bundles
    re.compile(r'\.min\.(js|css)$'),
    re.compile(r'\.bundle\.(js|css)$'),
    # TypeScript
    re.compile(r'\.d\.ts$'),                          # ambient declaration files
    re.compile(r'_generated\.ts$'),
    # Go
    re.compile(r'\.pb\.go$'),
    re.compile(r'_generated\.go$'),
    # C# — generated / designer files
    re.compile(r'\.g\.cs$'),                          # source generators
    re.compile(r'\.designer\.cs$'),                   # WinForms / WPF designer
    re.compile(r'AssemblyInfo\.cs$'),
    re.compile(r'GlobalUsings\.g\.cs$'),
    re.compile(r'\.AssemblyAttributes\.cs$'),
    # Lock files / manifests
    re.compile(r'swagger\.json$'),
    re.compile(r'package-lock\.json$'),
    re.compile(r'yarn\.lock$'),
    re.compile(r'pnpm-lock\.yaml$'),
    re.compile(r'Cargo\.lock$'),
    re.compile(r'packages\.lock\.json$'),             # NuGet lock
]

TEST_PATTERNS = [
    # TypeScript / JavaScript
    re.compile(r'\.test\.(ts|tsx|js|jsx)$'),
    re.compile(r'\.spec\.(ts|tsx|js|jsx)$'),
    re.compile(r'/__tests__/'),
    # Python
    re.compile(r'test_[^/]+\.py$'),
    re.compile(r'[^/]+_test\.py$'),
    # Go
    re.compile(r'_test\.go$'),
    # C# — xUnit / NUnit / MSTest conventions
    re.compile(r'Tests?\.cs$'),                       # MyServiceTests.cs
    re.compile(r'Spec\.cs$'),                         # MyServiceSpec.cs
    re.compile(r'Fixture\.cs$'),                      # test fixtures
    re.compile(r'/Tests?/'),                          # Tests/ or Test/ directory
    re.compile(r'\.Tests/'),                          # MyProject.Tests/
    re.compile(r'\.Specs/'),
    re.compile(r'/Fixtures?/'),
    re.compile(r'/spec/'),
]

# ── Language parsers ──────────────────────────────────────────────────────────

def detect_language(path: Path) -> str | None:
    ext = path.suffix.lower()
    MAP = {
        '.ts': 'typescript', '.tsx': 'typescript',
        '.js': 'javascript', '.jsx': 'javascript',
        '.mjs': 'javascript', '.cjs': 'javascript',
        '.py': 'python',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.java': 'java',
        '.kt': 'kotlin',
        '.swift': 'swift',
        '.c': 'c', '.h': 'c',
        '.cpp': 'cpp', '.cc': 'cpp', '.hpp': 'cpp',
        '.cs': 'csharp',
        '.php': 'php',
        '.scala': 'scala',
        '.ex': 'elixir', '.exs': 'elixir',
        '.clj': 'clojure',
        '.hs': 'haskell',
        '.dart': 'dart',
        '.vue': 'vue',
        '.svelte': 'svelte',
        '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
        '.html': 'html', '.htm': 'html',
        '.sql': 'sql',
        '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
        '.md': 'markdown', '.mdx': 'markdown',
        '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
        '.toml': 'toml',
    }
    return MAP.get(ext)


def _strip_ts_comments(src: str) -> str:
    """Remove // line comments and /* block comments */ to avoid false matches."""
    src = re.sub(r'//[^\n]*', '', src)
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    return src


# Decorators that signal an adapter/seam role — useful for depth scoring
_TS_ADAPTER_DECORATORS = re.compile(
    r'@(?:Injectable|Component|Controller|Directive|Pipe|Module|Guard|'
    r'Interceptor|Resolver|EventHandler|MessageHandler|UseCase|Service|'
    r'ApiController|Route|Get|Post|Put|Delete|Patch)\b'
)

# Path alias prefixes that indicate internal imports (tsconfig paths)
_TS_ALIAS_PREFIXES = ('@/', '~/', '#', '@app/', '@core/', '@shared/', '@modules/')


def parse_ts_js(content: str, path: Path) -> dict:
    """
    Extract exports, types, imports, decorators from TypeScript / JavaScript.

    Handles:
    - Named exports (function, class, const, let, var, enum, namespace)
    - Type / interface exports
    - export default (named and anonymous)
    - export { a, b as c } (local and from '...' re-exports)
    - export * from '...'  and  export * as Ns from '...'
    - Decorators (@Injectable, @Component, etc.)
    - Static and dynamic imports
    - Type-only imports (import type)
    - Path aliases (@/, ~/, tsconfig paths)
    - Ambient / declare exports
    """
    clean = _strip_ts_comments(content)

    exports: list[str] = []
    types: list[str] = []
    re_exports: list[str] = []
    imports: list[dict] = []
    default_export: str | None = None
    decorators: list[str] = []
    adapter_count = 0

    # ── Decorators ────────────────────────────────────────────────────────────
    for m in re.finditer(r'@([A-Z][A-Za-z0-9]*)\s*(?:\()?', clean):
        decorators.append(m.group(1))
    adapter_count = len(_TS_ADAPTER_DECORATORS.findall(clean))

    # ── export default ────────────────────────────────────────────────────────
    # export default function/class Name  — named
    for m in re.finditer(
        r'^export\s+default\s+(?:async\s+)?(?:function|class)\s+(\w+)',
        clean, re.MULTILINE
    ):
        default_export = m.group(1)
        exports.append(m.group(1))

    # export default expression (anonymous) — just record 'default'
    anon = re.search(r'^export\s+default\s+(?!function|class|async\s+function)(.+?)(?:;|\n)', clean, re.MULTILINE)
    if anon and not default_export:
        default_export = 'default'

    # ── Named exports (declarations) ──────────────────────────────────────────
    # export [declare] [abstract] (function|class|const|let|var|enum|namespace) Name
    for m in re.finditer(
        r'^export\s+(?:declare\s+)?(?:abstract\s+)?'
        r'(async\s+function|function\*?|class|const|let|var|enum|namespace|module)\s+(\w+)',
        clean, re.MULTILINE
    ):
        exports.append(m.group(2))

    # export type/interface Name
    for m in re.finditer(
        r'^export\s+(?:declare\s+)?(?:type|interface)\s+(\w+)',
        clean, re.MULTILINE
    ):
        types.append(m.group(1))

    # declare export (ambient modules)
    for m in re.finditer(
        r'^declare\s+(?:global\s+)?(?:export\s+)?(?:function|class|const|var|enum|namespace|module)\s+(\w+)',
        clean, re.MULTILINE
    ):
        exports.append(m.group(1))

    # ── export { ... } and export { ... } from '...' ──────────────────────────
    for m in re.finditer(r'export\s*\{([^}]+)\}\s*(?:from\s*[\'"]([^\'"]+)[\'"])?', clean):
        syms_raw = m.group(1)
        source = m.group(2)
        syms = []
        for part in syms_raw.split(','):
            part = part.strip()
            if not part:
                continue
            # Handle `name as alias` and `type name`
            part = re.sub(r'^type\s+', '', part)
            alias_match = re.search(r'\bAs\b|\bas\b', part)
            if alias_match:
                syms.append(part.split()[-1])
            else:
                syms.append(part.split()[0])
        if source:
            re_exports.extend(syms)
        else:
            exports.extend(syms)

    # ── export * from '...'  /  export * as Ns from '...' ────────────────────
    for m in re.finditer(r"export\s*\*\s*(?:as\s+(\w+)\s+)?from\s*['\"]([^'\"]+)['\"]", clean):
        ns = m.group(1)
        src = m.group(2)
        re_exports.append(f'{ns} from {src}' if ns else f'* from {src}')

    # ── Imports ───────────────────────────────────────────────────────────────
    seen_imports: set[str] = set()

    def _add_import(src: str):
        if src in seen_imports:
            return
        seen_imports.add(src)
        is_internal = (
            src.startswith('.')
            or any(src.startswith(p) for p in _TS_ALIAS_PREFIXES)
        )
        imports.append({
            'path': src,
            'resolved': None,
            'kind': 'internal' if is_internal else 'external',
        })

    # Static: import ... from '...'  /  import type ... from '...'
    for m in re.finditer(r"import\s+(?:type\s+)?[^'\"]*?['\"]([^'\"]+)['\"]", clean):
        _add_import(m.group(1))

    # Side-effect: import '...'
    for m in re.finditer(r"import\s+['\"]([^'\"]+)['\"]", clean):
        _add_import(m.group(1))

    # Dynamic: import('...')  /  require('...')
    for m in re.finditer(r"(?:import|require)\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", clean):
        _add_import(m.group(1))

    result = {
        'exports': list(dict.fromkeys(exports)),
        're_exports': list(dict.fromkeys(re_exports)),
        'types': list(dict.fromkeys(types)),
        'default_export': default_export,
        'imports': imports,
        # Extra TS-specific metadata stored at parse level
        '_decorators': list(dict.fromkeys(decorators)),
        '_adapter_count': adapter_count,
    }
    return result


def parse_python(content: str, path: Path) -> dict:
    """Extract exports and imports from Python source."""
    exports = []
    types = []
    imports = []

    # __all__
    m = re.search(r"^__all__\s*=\s*\[([^\]]+)\]", content, re.MULTILINE)
    if m:
        exports = [s.strip().strip("'\"") for s in m.group(1).split(',') if s.strip()]

    # Top-level defs (class, def, variable assignments)
    if not exports:
        for m in re.finditer(r'^(class|def)\s+([A-Za-z_]\w*)', content, re.MULTILINE):
            name = m.group(2)
            if not name.startswith('_'):
                if m.group(1) == 'class':
                    types.append(name)
                else:
                    exports.append(name)

    # Imports
    for m in re.finditer(r'^(?:from\s+(\S+)\s+)?import\s+(.+)$', content, re.MULTILINE):
        src = m.group(1) or m.group(2).split()[0]
        kind = 'internal' if (src.startswith('.') or not src.startswith(('os', 'sys', 're', 'json',
            'math', 'datetime', 'collections', 'itertools', 'functools', 'typing',
            'pathlib', 'subprocess', 'threading', 'logging', 'abc', 'copy',
            'io', 'time', 'random', 'hashlib', 'base64', 'urllib', 'http',
            'socket', 'struct', 'unittest', 'dataclasses', 'enum', 'contextlib',
            'asyncio', 'concurrent', 'multiprocessing', 'argparse', 'csv', 'shutil'
        ))) else 'external'
        imports.append({'path': src, 'resolved': None, 'kind': kind})

    return {
        'exports': list(dict.fromkeys(exports)),
        're_exports': [],
        'types': list(dict.fromkeys(types)),
        'default_export': None,
        'imports': imports,
    }


def parse_go(content: str, path: Path) -> dict:
    """Extract exported identifiers from Go source."""
    exports = []
    types = []
    imports = []

    # Exported identifiers (start with capital)
    for m in re.finditer(r'^(?:func|type|var|const)\s+([A-Z][A-Za-z0-9_]*)', content, re.MULTILINE):
        name = m.group(1)
        if re.search(r'^type\s+' + re.escape(name), content, re.MULTILINE):
            types.append(name)
        else:
            exports.append(name)

    # Imports
    for m in re.finditer(r'"([^"]+)"', content):
        src = m.group(1)
        kind = 'external' if '/' not in src or src.count('/') < 2 else 'internal'
        imports.append({'path': src, 'resolved': None, 'kind': kind})

    return {
        'exports': list(dict.fromkeys(exports)),
        're_exports': [],
        'types': list(dict.fromkeys(types)),
        'default_export': None,
        'imports': imports,
    }


def parse_rust(content: str, path: Path) -> dict:
    """Extract pub items from Rust source."""
    exports = []
    types = []
    imports = []

    for m in re.finditer(r'^pub\s+(?:async\s+)?(?:fn|struct|enum|trait|type|const|static|mod)\s+(\w+)', content, re.MULTILINE):
        kw_match = re.search(r'pub\s+(?:async\s+)?(fn|struct|enum|trait|type|const|static|mod)', content[m.start():m.start()+80])
        kw = kw_match.group(1) if kw_match else 'fn'
        name = m.group(1)
        if kw in ('struct', 'enum', 'trait', 'type'):
            types.append(name)
        else:
            exports.append(name)

    for m in re.finditer(r'^use\s+([^;]+);', content, re.MULTILINE):
        src = m.group(1).strip()
        kind = 'internal' if src.startswith('crate::') or src.startswith('super::') or src.startswith('self::') else 'external'
        imports.append({'path': src, 'resolved': None, 'kind': kind})

    return {
        'exports': list(dict.fromkeys(exports)),
        're_exports': [],
        'types': list(dict.fromkeys(types)),
        'default_export': None,
        'imports': imports,
    }


def _strip_cs_comments(src: str) -> str:
    """Remove // and /* */ comments, and verbatim strings that confuse regex."""
    src = re.sub(r'//[^\n]*', '', src)
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.DOTALL)
    return src


# C# attributes that signal adapter/seam roles
_CS_ADAPTER_ATTRS = re.compile(
    r'\[\s*(?:ApiController|HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch|'
    r'Route|Authorize|AllowAnonymous|ServiceFilter|TypeFilter|'
    r'EventHandler|MessageHandler|KafkaConsumer|RabbitMqConsumer|'
    r'FunctionName|HttpTrigger|QueueTrigger|TimerTrigger|'
    r'GrpcService|GraphQLMutation|GraphQLQuery)\s*(?:\([^)]*\))?\s*\]'
)

# Well-known .NET system namespaces — treated as external imports
_CS_SYSTEM_NS = re.compile(
    r'^(?:System|Microsoft|Azure|Newtonsoft|AutoMapper|MediatR|'
    r'Serilog|NLog|Polly|FluentValidation|StackExchange|Dapper|'
    r'EntityFrameworkCore|Npgsql|MongoDB|RabbitMQ|Confluent|'
    r'Grpc|Google|Amazon|AWSSDK)\b'
)


def parse_csharp(content: str, path: Path) -> dict:
    """
    Extract interface surface from C# source files.

    Handles:
    - Namespace declarations (traditional and file-scoped)
    - Top-level public types: class, interface, struct, record, enum, delegate
    - abstract, sealed, partial, static modifiers
    - Public methods and properties on those types (for interface surface)
    - using directives (as imports)
    - Attributes: [ApiController], [Inject], etc. to detect adapter roles
    - Primary constructors and constructor injection (depth signal)
    - internal vs public access (only public = exported)
    """
    clean = _strip_cs_comments(content)

    exports: list[str] = []     # public value-bearing symbols (methods, properties)
    types: list[str] = []       # public types (class, interface, struct, record, enum)
    imports: list[dict] = []
    attributes: list[str] = []
    namespaces: list[str] = []
    adapter_count = 0

    # ── Namespace ─────────────────────────────────────────────────────────────
    # File-scoped:  namespace My.App.Services;
    # Traditional:  namespace My.App.Services {
    for m in re.finditer(r'^namespace\s+([\w.]+)\s*[;{]', clean, re.MULTILINE):
        namespaces.append(m.group(1))

    # ── Attributes ────────────────────────────────────────────────────────────
    for m in re.finditer(r'\[\s*([A-Z][A-Za-z0-9]*)\s*(?:\([^)]*\))?\s*\]', clean):
        attributes.append(m.group(1))
    adapter_count = len(_CS_ADAPTER_ATTRS.findall(clean))

    # ── Public types ──────────────────────────────────────────────────────────
    # Matches: public [abstract|sealed|static|partial|readonly]* (class|interface|struct|record|enum|delegate) Name
    type_pattern = re.compile(
        r'^[ \t]*(?:public\s+)'
        r'(?:(?:abstract|sealed|static|partial|readonly|unsafe|new)\s+)*'
        r'(class|interface|struct|record|enum|delegate)\s+(\w+)',
        re.MULTILINE
    )
    for m in type_pattern.finditer(clean):
        kind = m.group(1)
        name = m.group(2)
        if kind in ('interface', 'enum', 'delegate'):
            types.append(name)
        else:
            types.append(name)   # class/struct/record go in types too

    # ── Public members (methods & properties) — interface surface ─────────────
    # Only look for public members that aren't overrides of private implementations
    member_pattern = re.compile(
        r'^[ \t]*(?:public\s+)'
        r'(?:(?:static|virtual|override|abstract|async|new|sealed|extern|unsafe)\s+)*'
        r'(?:[\w<>\[\],\s?]+?\s+)'     # return type (rough)
        r'(\w+)\s*'
        r'(?:\([^)]*\)|(?:\s*\{|\s*=>|\s*;))',  # method params OR property body
        re.MULTILINE
    )
    for m in member_pattern.finditer(clean):
        name = m.group(1)
        # Filter out common false positives
        if name in ('get', 'set', 'init', 'add', 'remove', 'value', 'class', 'return',
                    'new', 'override', 'virtual', 'static', 'void', 'string', 'int',
                    'bool', 'var', 'Task', 'IEnumerable', 'List', 'Dictionary'):
            continue
        if not re.match(r'^[A-Z]', name):   # C# public members are PascalCase
            continue
        exports.append(name)

    # ── Constructor injection (depth signal: constructor params = dependencies) ─
    # Count ctor params to approximate how many seams this type sits at
    ctor_params: list[str] = []
    for m in re.finditer(r'public\s+\w+\s*\(([^)]+)\)', clean):
        params = m.group(1)
        # Each param with an interface type (starts with I + capital) is an injected dep
        for p in re.finditer(r'\bI([A-Z]\w+)\b', params):
            ctor_params.append('I' + p.group(1))

    # ── using directives (imports) ────────────────────────────────────────────
    seen_usings: set[str] = set()
    for m in re.finditer(r'^using\s+(?:static\s+|global\s+)?(?:[\w.]+\s*=\s*)?([\w.]+)\s*;', clean, re.MULTILINE):
        ns = m.group(1)
        if ns in seen_usings:
            continue
        seen_usings.add(ns)
        is_external = bool(_CS_SYSTEM_NS.match(ns))
        imports.append({
            'path': ns,
            'resolved': None,
            'kind': 'external' if is_external else 'internal',
        })

    return {
        'exports': list(dict.fromkeys(exports))[:40],
        're_exports': [],
        'types': list(dict.fromkeys(types)),
        'default_export': None,
        'imports': imports,
        '_namespaces': namespaces,
        '_attributes': list(dict.fromkeys(attributes)),
        '_adapter_count': adapter_count,
        '_injected_deps': list(dict.fromkeys(ctor_params)),
    }


def parse_file(path: Path, lang: str | None, content: str) -> dict:
    if lang in ('typescript', 'javascript'):
        return parse_ts_js(content, path)
    elif lang == 'csharp':
        return parse_csharp(content, path)
    elif lang == 'python':
        return parse_python(content, path)
    elif lang == 'go':
        return parse_go(content, path)
    elif lang == 'rust':
        return parse_rust(content, path)
    return {
        'exports': [], 're_exports': [], 'types': [], 'default_export': None,
        'imports': [], '_adapter_count': 0,
    }


# ── Depth scoring ─────────────────────────────────────────────────────────────

def depth_score(
    loc: int,
    exports: list,
    types: list,
    imports: list,
    importer_count: int,
    adapter_count: int = 0,
    injected_deps: list | None = None,
) -> float:
    """
    Estimate module depth (leverage at interface) as a 0-1 float.

    High depth = many behaviours behind a small interface.
    Low depth  = interface nearly as complex as implementation (pass-through).

    adapter_count: number of framework-adapter decorators/attributes found
                   (e.g. @Injectable, [ApiController]) — these are seam markers,
                   not depth — penalise slightly so adapters don't look deep.
    injected_deps: constructor-injected interfaces (C#) — signals the module
                   participates in DI but doesn't tell us about its own depth.
    """
    if loc <= 0:
        return -1.0

    total_symbols = len(exports) + len(types)
    if total_symbols == 0:
        return -1.0

    # Interface surface ratio: fewer exports per LOC → deeper
    surface_density = total_symbols / max(1, loc / 50)
    surface_score = max(0.0, 1.0 - min(1.0, surface_density / 3))

    # Pass-through penalty: many imports relative to LOC → glue/barrel file
    import_density = len(imports) / max(1, loc / 20)
    passthrough_penalty = min(1.0, import_density / 5)

    # Locality bonus: used by many callers → earns its keep
    locality_bonus = 0.2 if importer_count >= 3 else (0.1 if importer_count >= 1 else 0.0)

    # Adapter penalty: pure adapters sit AT a seam but aren't necessarily deep
    # (they delegate to implementation). Slight penalty to distinguish from core modules.
    adapter_penalty = min(0.15, adapter_count * 0.05)

    raw = (surface_score * (1.0 - passthrough_penalty * 0.5)) + locality_bonus - adapter_penalty
    return max(0.0, min(1.0, raw))


def depth_label(score: float) -> str:
    if score < 0:      return 'unknown'
    if score < 0.30:   return 'shallow'
    if score < 0.60:   return 'moderate'
    if score < 0.80:   return 'deep'
    return 'very-deep'


def depth_rationale(score: float, loc: int, exports: list, imports: list, importer_count: int) -> str:
    if score < 0:
        return 'Interface not detected — non-source file or unsupported language.'
    if score < 0.30:
        if len(imports) > len(exports) * 2:
            return f'Shallow — primarily re-routes {len(imports)} imports through {len(exports)} exports (likely a pass-through or barrel file).'
        return f'Shallow — the {len(exports)} exported symbol(s) represent a thin surface over {loc} lines; callers see most of the complexity.'
    if score < 0.60:
        return f'Moderate depth — {len(exports)} export(s) over {loc} lines offers some leverage; room to grow the implementation without widening the interface.'
    if score < 0.80:
        return f'Deep — a small interface of {len(exports)} symbol(s) hides {loc} lines; callers and tests exercise significant behaviour without knowing its internals.'
    return f'Very deep — high leverage. {len(exports)} symbol(s) front {loc} lines; changing the implementation is unlikely to ripple to the {importer_count} module(s) that use it.'


# ── File node builder ─────────────────────────────────────────────────────────

def is_generated(path: Path) -> bool:
    name = path.name
    return any(p.search(name) for p in GENERATED_PATTERNS)


def is_test_file(path: Path) -> bool:
    s = str(path)
    return any(p.search(s) for p in TEST_PATTERNS)


def build_file_node(path: Path, repo_root: Path) -> dict:
    rel = str(path.relative_to(repo_root))
    stat = path.stat()
    size = stat.st_size
    lang = detect_language(path)
    generated = is_generated(path)
    is_test = is_test_file(path)

    content = ''
    loc = 0
    if lang and not generated and size < 500_000:
        try:
            content = path.read_text(encoding='utf-8', errors='ignore')
            loc = content.count('\n')
        except Exception:
            pass

    parsed = parse_file(path, lang, content)
    exports = parsed['exports']
    types = parsed['types']
    imports = parsed['imports']

    adapter_count = parsed.get('_adapter_count', 0)
    injected_deps = parsed.get('_injected_deps', [])
    score = depth_score(loc, exports, types, imports, 0, adapter_count, injected_deps)  # importer_count patched later
    lbl = depth_label(score)
    rationale = depth_rationale(score, loc, exports, imports, 0)

    # Language-specific extras for the UI panel
    extras: dict = {}
    if lang in ('typescript', 'javascript'):
        extras['decorators'] = parsed.get('_decorators', [])
        extras['adapter_count'] = parsed.get('_adapter_count', 0)
    elif lang == 'csharp':
        extras['namespaces'] = parsed.get('_namespaces', [])
        extras['attributes'] = parsed.get('_attributes', [])
        extras['adapter_count'] = parsed.get('_adapter_count', 0)
        extras['injected_deps'] = parsed.get('_injected_deps', [])

    return {
        'name': path.name,
        'path': rel,
        'abs_path': str(path),
        'size': size,
        'loc': loc,
        'module_type': 'file',
        'children': [],
        'language': lang,
        'is_test': is_test,
        'is_generated': generated,
        'interface': {
            'exports': exports,
            're_exports': parsed.get('re_exports', []),
            'types': types,
            'default_export': parsed.get('default_export'),
        },
        'imports': imports,
        'importer_count': 0,
        'depth_score': score,
        'depth_label': lbl,
        'depth_rationale': rationale,
        **extras,
    }


# ── Directory node builder ────────────────────────────────────────────────────

def build_dir_node(path: Path, repo_root: Path, max_files: int, seen: list) -> dict | None:
    rel = str(path.relative_to(repo_root)) if path != repo_root else '.'
    children = []
    total_size = 0
    total_loc = 0

    entries = sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    for entry in entries:
        if entry.name.startswith('.') and entry.name not in {'.env', '.envrc'}:
            continue
        if entry.is_dir():
            if entry.name in SKIP_DIRS:
                continue
            child = build_dir_node(entry, repo_root, max_files, seen)
            if child:
                children.append(child)
                total_size += child['size']
                total_loc += child['loc']
        elif entry.is_file():
            if len(seen) >= max_files:
                continue
            if entry.suffix.lower() not in SOURCE_EXTENSIONS and entry.stat().st_size > 1_000_000:
                continue
            node = build_file_node(entry, repo_root)
            children.append(node)
            total_size += node['size']
            total_loc += node['loc']
            seen.append(str(entry))

    if not children:
        return None

    # Aggregate exports for directory (merge from children that are files)
    dir_exports = []
    dir_types = []
    for c in children:
        if c['module_type'] == 'file':
            dir_exports.extend(c['interface']['exports'])
            dir_types.extend(c['interface']['types'])

    # Depth for directories: average of children's scores (files only)
    file_scores = [c['depth_score'] for c in children if c['module_type'] == 'file' and c['depth_score'] >= 0]
    dir_score = (sum(file_scores) / len(file_scores)) if file_scores else -1.0
    dir_lbl = depth_label(dir_score)

    return {
        'name': path.name,
        'path': rel,
        'abs_path': str(path),
        'size': total_size,
        'loc': total_loc,
        'module_type': 'directory',
        'children': children,
        'language': None,
        'is_test': False,
        'is_generated': False,
        'interface': {
            'exports': list(dict.fromkeys(dir_exports))[:30],
            're_exports': [],
            'types': list(dict.fromkeys(dir_types))[:20],
            'default_export': None,
        },
        'imports': [],
        'importer_count': 0,
        'depth_score': dir_score,
        'depth_label': dir_lbl,
        'depth_rationale': f'Directory average across {len(file_scores)} analysed source file(s).',
    }


# ── Importer count pass ───────────────────────────────────────────────────────

def patch_importer_counts(root: dict) -> None:
    """Second pass: count how many files import each path."""
    # Build map: normalised path → node
    path_to_node: dict[str, dict] = {}

    def index(node: dict):
        path_to_node[node['path']] = node
        for c in node.get('children', []):
            index(c)

    index(root)

    # For each file node, register its imports
    importer_counts: dict[str, int] = {}

    def walk(node: dict):
        for imp in node.get('imports', []):
            if imp['kind'] == 'internal':
                target = imp['path']
                importer_counts[target] = importer_counts.get(target, 0) + 1
        for c in node.get('children', []):
            walk(c)

    walk(root)

    # Update nodes
    def apply(node: dict):
        count = importer_counts.get(node['path'], 0)
        node['importer_count'] = count
        # Recompute depth score with importer count now known
        if node['module_type'] == 'file' and node['loc'] > 0:
            exports = node['interface']['exports']
            types = node['interface']['types']
            imports = node['imports']
            score = depth_score(node['loc'], exports, types, imports, count,
                                node.get('adapter_count', 0),
                                node.get('injected_deps', []))
            node['depth_score'] = score
            node['depth_label'] = depth_label(score)
            node['depth_rationale'] = depth_rationale(score, node['loc'], exports, imports, count)
        for c in node.get('children', []):
            apply(c)

    apply(root)


# ── Summary ───────────────────────────────────────────────────────────────────

def build_summary(root: dict, seen: list) -> dict:
    langs: dict[str, int] = {}
    scores = []
    shallowest = []
    deepest = []

    def walk(node):
        if node['module_type'] == 'file':
            lang = node.get('language') or 'other'
            langs[lang] = langs.get(lang, 0) + 1
            s = node['depth_score']
            if s >= 0:
                scores.append((s, node['path']))
        for c in node.get('children', []):
            walk(c)

    walk(root)
    scores.sort(key=lambda x: x[0])
    shallowest = [p for _, p in scores[:5]]
    deepest = [p for _, p in scores[-5:]][::-1]

    return {
        'total_files': len(seen),
        'total_loc': root['loc'],
        'total_size_bytes': root['size'],
        'languages': langs,
        'avg_depth_score': round(sum(s for s, _ in scores) / max(1, len(scores)), 3),
        'shallowest_modules': shallowest,
        'deepest_modules': deepest,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Codebase architecture analyser')
    parser.add_argument('repo_path', help='Path to the repository root')
    parser.add_argument('--max-files', type=int, default=50_000, help='Stop after this many files')
    args = parser.parse_args()

    repo = Path(args.repo_path).resolve()
    if not repo.exists():
        print(f'ERROR: path does not exist: {repo}', file=sys.stderr)
        sys.exit(1)
    if not repo.is_dir():
        print(f'ERROR: not a directory: {repo}', file=sys.stderr)
        sys.exit(1)

    seen: list[str] = []
    root = build_dir_node(repo, repo, args.max_files, seen)

    if root is None:
        print('ERROR: no source files found', file=sys.stderr)
        sys.exit(1)

    patch_importer_counts(root)

    output = {
        'schema_version': '1',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'repo_root': str(repo),
        'summary': build_summary(root, seen),
        'root': root,
    }

    json.dump(output, sys.stdout, indent=None, separators=(',', ':'), ensure_ascii=False)


if __name__ == '__main__':
    main()
