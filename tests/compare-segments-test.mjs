// Standalone check of the compareSegments algorithm (mirrors the bundle copy) against synthetic unified-diff hunks.
function compareSegments(diff, afterText) {
	const afterLines = afterText.split("\n");
	const body = afterText === "" ? [] : afterText.endsWith("\n") ? afterLines.slice(0, -1) : afterLines;
	const timeline = [];
	let runB = [], runA = [];
	const closeRun = () => {
		if (runB.length === 0) return;
		timeline.push({ type: "ctx", text: runB.join("\n") + "\n" });
		runB = [];
		runA = [];
	};
	const pushRun = (bRun, aRun) => {
		if (bRun.length === 0 && aRun.length === 0) return;
		closeRun();
		timeline.push({
			type: "chg",
			before: bRun.length === 0 ? void 0 : bRun.join("\n") + "\n",
			after: aRun.length === 0 ? void 0 : aRun.join("\n") + "\n"
		});
	};
	let cursor = 0;
	for (const hunk of diff.hunks) {
		const start = hunk.newLines === 0 ? hunk.newStart : hunk.newStart - 1;
		if (start < cursor || start > body.length) return void 0;
		let k = start;
		for (const line of hunk.lines) if (line[0] === " " || line[0] === "+") {
			if (k >= body.length || body[k] !== line.slice(1)) return void 0;
			k += 1;
		}
		while (cursor < start) { runB.push(body[cursor]); runA.push(body[cursor]); cursor += 1; }
		let f = 0, e = hunk.lines.length - 1;
		while (f <= e && hunk.lines[f][0] === " ") f += 1;
		while (e >= f && hunk.lines[e][0] === " ") e -= 1;
		if (f > e) for (const line of hunk.lines) { runB.push(line.slice(1)); runA.push(line.slice(1)); }
		else {
			for (let x = 0; x < f; x += 1) { runB.push(hunk.lines[x].slice(1)); runA.push(hunk.lines[x].slice(1)); }
			let bRun = [], aRun = [];
			for (let x = f; x <= e; x += 1) {
				const line = hunk.lines[x];
				if (line[0] === " ") {
					pushRun(bRun, aRun);
					bRun = [];
					aRun = [];
					runB.push(line.slice(1));
					runA.push(line.slice(1));
				} else if (line[0] === "-") bRun.push(line.slice(1));
				else aRun.push(line.slice(1));
			}
			pushRun(bRun, aRun);
			for (let x = e + 1; x < hunk.lines.length; x += 1) { runB.push(hunk.lines[x].slice(1)); runA.push(hunk.lines[x].slice(1)); }
		}
		cursor = k;
	}
	if (cursor > body.length) return void 0;
	while (cursor < body.length) { runB.push(body[cursor]); cursor += 1; }
	closeRun();
	return timeline;
}
const beforeText = (segs) => segs.map(s => s.type === "ctx" ? s.text : (s.before ?? "")).join("");
const afterText = (segs) => segs.map(s => s.type === "ctx" ? s.text : (s.after ?? "")).join("");

const cases = [];
function check(name, ok, detail) { cases.push([name, ok, detail]); }
const eq = (a, b) => a === b;

// 1. middle edit
const r1 = compareSegments({ hunks: [{ oldStart: 2, oldLines: 1, newStart: 2, newLines: 1, lines: ["-B", "+X"] }] }, "A\nX\nC\nD\n");
check("middle edit before full text", eq(beforeText(r1), "A\nB\nC\nD\n"));
check("middle edit after full text", eq(afterText(r1), "A\nX\nC\nD\n"));
check("middle edit timeline", eq(JSON.stringify(r1), JSON.stringify([
	{ type: "ctx", text: "A\n" }, { type: "chg", before: "B\n", after: "X\n" }, { type: "ctx", text: "C\nD\n" }
])), JSON.stringify(r1));

// 2. insert at top (pure addition: no before on the change entry)
const r2 = compareSegments({ hunks: [{ oldStart: 0, oldLines: 0, newStart: 1, newLines: 1, lines: ["+A"] }] }, "A\nB\n");
check("insert at top before", eq(beforeText(r2), "B\n"));
check("insert at top after", eq(afterText(r2), "A\nB\n"));
check("insert at top timeline", eq(JSON.stringify(r2), JSON.stringify([
	{ type: "chg", before: void 0, after: "A\n" }, { type: "ctx", text: "B\n" }
])), JSON.stringify(r2));

// 3. edit to empty (all deleted)
const r3 = compareSegments({ hunks: [{ oldStart: 1, oldLines: 3, newStart: 0, newLines: 0, lines: ["-A", "-B", "-C"] }] }, "");
check("edit to empty before", eq(beforeText(r3), "A\nB\nC\n"));
check("edit to empty after empty", eq(afterText(r3), ""));

// 4. delete middle with edge context
const r4 = compareSegments({ hunks: [{ oldStart: 1, oldLines: 3, newStart: 1, newLines: 2, lines: [" A", "-B", " C"] }] }, "A\nC\n");
check("delete middle before full", eq(beforeText(r4), "A\nB\nC\n"), beforeText(r4));
check("delete middle after full", eq(afterText(r4), "A\nC\n"), afterText(r4));
check("delete middle timeline", eq(JSON.stringify(r4), JSON.stringify([
	{ type: "ctx", text: "A\n" }, { type: "chg", before: "B\n", after: void 0 }, { type: "ctx", text: "C\n" }
])), JSON.stringify(r4));

// 5. two hunks with unchanged run between
const r5 = compareSegments({ hunks: [
	{ oldStart: 2, oldLines: 1, newStart: 2, newLines: 1, lines: ["-B", "+B2"] },
	{ oldStart: 6, oldLines: 1, newStart: 6, newLines: 1, lines: ["-F", "+F2"] }
] }, "A\nB2\nC\nD\nE\nF2\nG\n");
check("two hunks before", eq(beforeText(r5), "A\nB\nC\nD\nE\nF\nG\n"));
check("two hunks after", eq(afterText(r5), "A\nB2\nC\nD\nE\nF2\nG\n"));
check("two hunks change entries", r5.filter(s => s.type === "chg").length === 2);

// 6. no trailing newline — EOL state is not carried by hunks; output normalizes it (rendering-equivalent)
const r6 = compareSegments({ hunks: [{ oldStart: 2, oldLines: 1, newStart: 2, newLines: 1, lines: ["-B", "+X"] }] }, "A\nX");
check("no trailing newline before", eq(beforeText(r6), "A\nB\n"));

// 7. mismatch (file changed again) → undefined
check("mismatch falls back", compareSegments({ hunks: [{ oldStart: 2, oldLines: 1, newStart: 2, newLines: 1, lines: ["-B", "+X"] }] }, "A\nY\nC\n") === undefined);

// 8. append at end
const r8 = compareSegments({ hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 3, lines: [" A", "+B", "+C"] }] }, "A\nB\nC\n");
check("append at end before", eq(beforeText(r8), "A\n"));
check("append at end after", eq(afterText(r8), "A\nB\nC\n"));

// 9. pure-context hunk → no change entries, text intact
const r9 = compareSegments({ hunks: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: [" A", " B"] }] }, "A\nB\n");
check("pure context hunk", eq(beforeText(r9), "A\nB\n") && r9.every(s => s.type === "ctx"));

// 10. interior context splits one hunk into alternating entries
const r10 = compareSegments({ hunks: [{ oldStart: 1, oldLines: 4, newStart: 1, newLines: 5, lines: ["-# T", "+# T2", " a", " b", " c", "+d"] }] }, "# T2\na\nb\nc\nd\n");
check("interior ctx before full", eq(beforeText(r10), "# T\na\nb\nc\n"), beforeText(r10));
check("interior ctx after full", eq(afterText(r10), "# T2\na\nb\nc\nd\n"), afterText(r10));
check("interior ctx timeline", eq(JSON.stringify(r10), JSON.stringify([
	{ type: "chg", before: "# T\n", after: "# T2\n" }, { type: "ctx", text: "a\nb\nc\n" }, { type: "chg", before: void 0, after: "d\n" }
])), JSON.stringify(r10));

let failed = 0;
for (const [name, ok, detail] of cases) {
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n  detail: ${detail}`}`);
	if (!ok) failed += 1;
}
console.log(failed === 0 ? `\nALL ${cases.length} CASES PASS` : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
