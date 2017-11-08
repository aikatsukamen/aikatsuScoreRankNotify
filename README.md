# aikatsuScoreRankingNotify
ランキングに更新があったら通知するやつ

## 使い方
1. `npm install`を実行し、各種モジュールをインストールする。（初回のみ）
1. `npm auth`を実行し、ダイアログに従ってトークンを取得する。
	- この時ログインに使ったアカウントでカツ！が飛びます。
1. 取得したトークンを環境変数`NODE_KKT_TOKEN`に設定する。
	- 環境変数の設定コマンドは、このスクリプトを動かすプラットフォームに合わせてね。
1. `npm start`を実行する。
	- 成功したらKKTに投稿され、ログにカツ！のURLが記録されます。

## トラブルシューティング
### トークン周りでエラーになる。
- authをやりなおしてみてね。
- authが吐き出すURLでscopeの値が間違ってることがあるので、クエリパラメータのscopeのとこでwriteだけにしてみるといけるかも。

### 差分情報がおかしい
- dataディレクトリに書き込み権限が無かったり？
- 公式がおかしいこともたまにある。

## その他
- 改造、再配布ご自由に(MITライセンス)
