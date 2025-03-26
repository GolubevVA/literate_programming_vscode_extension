import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export function activate(context: vscode.ExtensionContext) {
  const serializer = new LPNBNotebookSerializer();
  context.subscriptions.push(
    vscode.workspace.registerNotebookSerializer(
      'literateProgramming.notebook',
      serializer,
      {
        transientOutputs: false,
        transientCellMetadata: {}
      }
    )
  );
}

class LPNBNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
    const text = new TextDecoder().decode(content);
    let parsed: any;
    try {
      parsed = yaml.load(text);
    } catch (err) {
      vscode.window.showErrorMessage('Error parsing notebook YAML: ' + err);
      parsed = {};
    }
    if (!parsed) {
      parsed = {};
    }

    const cells: vscode.NotebookCellData[] = [];
    const defaultLang = (parsed.metadata && parsed.metadata.language) ? parsed.metadata.language : 'plaintext';

    if (parsed.sections && Array.isArray(parsed.sections)) {
      for (const section of parsed.sections) {
        if (section.docs) {
          const mdCell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Markup,
            section.docs,
            'markdown'
          );
          cells.push(mdCell);
        }
        if (section.code) {
          const codeCell = new vscode.NotebookCellData(
            vscode.NotebookCellKind.Code,
            section.code,
            defaultLang
          );
          cells.push(codeCell);
        }
      }
    }
    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
    const sections: any[] = [];
    const cells = data.cells;

    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i].kind === vscode.NotebookCellKind.Markup) {
        if (i + 1 < cells.length && cells[i + 1].kind === vscode.NotebookCellKind.Code) {
          const docCell = cells[i];
          const codeCell = cells[i + 1];
          const docs = docCell.value;
          const code = codeCell.value;
          sections.push({
            docs,
            code
          });
          i += 1;
          continue;
        } else {
          const docCell = cells[i];
          const docs = docCell.value;
          sections.push({
            docs,
            code: ""
          });
        }
      } else {
        const codeCell = cells[i];
        const code = codeCell.value;
        sections.push({
          docs: "",
          code
        });
      }
    }

    const notebookObj = {
      metadata: {
        language: cells.find(cell => cell.kind === vscode.NotebookCellKind.Code)?.languageId || 'plaintext'
      },
      sections: sections
    };

    const yamlString = yaml.dump(notebookObj);
    return new TextEncoder().encode(yamlString);
  }
}

export function deactivate() {}
