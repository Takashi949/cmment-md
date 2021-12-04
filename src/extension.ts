// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Console } from 'console';
import * as vscode from 'vscode';

const katex = require('katex');
const mathjx = require('mathjax-node');
const COMMAND = 'cmment-md.form';
const keyword = 'showFormura';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cmment-md" is now active! ccc');
	mathjx.start();
	context.subscriptions.push(
		vscode.languages.registerHoverProvider('rust', new FormProvider())
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class FormProvider implements vscode.HoverProvider {
	async provideHover(document :vscode.TextDocument, pos: vscode.Position, token:vscode.CancellationToken){
		const form = this.getFormula(document, pos);
		if(form.type == "none"){
			//console.log('no match nothing to show');
			return Promise.reject('no match');
		}

		//console.log(form);
		let result = await mathjx.typeset({math:form.form, svg:true, format:form.type});
		if(!result.errors){
			//console.log("conv");
			let svg = result.svg.replace("currentColor", "").replace("currentColor", '#FFF');
			svg = Buffer.from(unescape(encodeURIComponent(svg)), 'binary').toString('base64');

			const md = new vscode.MarkdownString("![error](data:image/svg+xml;base64," + svg + ")");
			md.isTrusted = true;
			return new vscode.Hover(md);
		}
	}

	/**
	 * a
	 * @param doc provideHoverのをそのまま入れる
	 * @param pos provideHoverのをそのまま入れる
	 * @returns 
	 */
	private getFormula(doc : vscode.TextDocument, pos: vscode.Position): {form:string, type:string}{
		const findRange = 5;
		const online = doc.lineAt(pos.line).text
		const foof = new RegExp(/fo(.+?)of/);
		const onlineForm = foof.exec(online);

		const fo = new RegExp(/fo(.+?)/g);
		const of = new RegExp(/(.+?)of/g);
		const before = doc.getText(new vscode.Range(
			new vscode.Position(pos.line - findRange, 0),
			new vscode.Position(pos.line, 0)
		));
		const after = doc.getText(new vscode.Range(
			new vscode.Position(pos.line + 1, 0),
			new vscode.Position(pos.line + findRange, 0)
		));
		const bf = (before.match(fo) ||[]).length - (before.match(of) || []).length;
		const af = (after.match(of) ||[]).length - (after.match(fo) ||[]).length;
		let formtext;

		//一行の形式が見つかった場合
		if(onlineForm){
			return this.typeChecker(onlineForm[1]);		
		}
		//前にfoがあまっている && 後にofが1つ余っている
		else if(bf == 1 && af == 1){
			//前後が数式
			formtext = (before + online + after).split('\n').join('').split('\r').join('');
		}
		//前にfoがあまっている && 同じ行にofがある
		else if(bf == 1 && (online.match("of") ||[]).length == 1){
			//前
			formtext = (before + online).split('\n').join('').split('\r').join('');
		}
		//後にofがあまっている && 同じ行にfoがある
		else if(af == 1 && (online.match("fo") ||[]).length == 1){
			//後
			formtext = (online + after).split('\n').join('').split('\r').join('');
		}

		if(formtext){
			const form = foof.exec(formtext);
			if(form)return this.typeChecker(form[1]);
		}
		//式じゃなかったら
		return {form: "", type:"none"};
	}

	private typeChecker(form:string): {form:string, type:string}{
		let TeXF = new RegExp(/\$\$(.+)\$\$/).exec(form);
		if(TeXF)return {form:TeXF[1], type:"TeX"};
		else {
			let asciimathF = form;
			if(asciimathF)return {form: asciimathF, type:"AsciiMath"};
		}
		return{form:"", type:"none"};
	}
}