import * as Lint from "tslint";
import * as ts from "typescript";

import { failure } from "../util";

export class Rule extends Lint.Rules.AbstractRule {
  static metadata: Lint.IRuleMetadata = {
    ruleName: "no-padding",
    description: "Forbids a blank line after `(` / `[` / `{`, or before `)` / `]` / `}`.",
    optionsDescription: "Not configurable.",
    options: null,
    type: "style",
    typescriptOnly: true
  };

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static FAILURE_STRING(kind: "before" | "after", token: ts.SyntaxKind) {
    return failure(Rule.metadata.ruleName, `Don't leave a blank line ${kind} '${ts.tokenToString(token)}'.`);
  }

  apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithFunction(sourceFile, walk);
  }
}

function walk(ctx: Lint.WalkContext<void>): void {
  const { sourceFile } = ctx;

  function fail(kind: "before" | "after", child: ts.Node): void {
    ctx.addFailureAtNode(child, Rule.FAILURE_STRING(kind, child.kind));
  }

  sourceFile.forEachChild(function cb(node) {
    const children = node.getChildren();
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      switch (child.kind) {
        case ts.SyntaxKind.OpenParenToken:
        case ts.SyntaxKind.OpenBracketToken:
        case ts.SyntaxKind.OpenBraceToken:
          if (i < children.length - 1 && blankLineInBetween(child.getEnd(), children[i + 1].getStart())) {
            fail("after", child);
          }
          break;

        case ts.SyntaxKind.CloseParenToken:
        case ts.SyntaxKind.CloseBracketToken:
        case ts.SyntaxKind.CloseBraceToken:
          if (i > 0 && blankLineInBetween(child.getStart() - 1, children[i - 1].getEnd() - 1)) {
            fail("before", child);
          }
          break;

        default:
          cb(child);
      }
    }
  });

  // Looks for two newlines (with nothing else in between besides whitespace)
  function blankLineInBetween(start: number, end: number): boolean {
    const step = start < end ? 1 : -1;
    let seenLine = false;
    for (let i = start; i !== end; i += step) {
      switch (sourceFile.text[i]) {
        case "\n":
          if (seenLine) {
            return true;
          } else {
            seenLine = true;
          }
          break;

        case " ":
        case "\t":
        case "\r":
          break;

        default:
          return false;
      }
    }

    return false;
  }
}
