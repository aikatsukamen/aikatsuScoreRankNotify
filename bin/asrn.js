'use strict';

/********************************************
 * ランキングが更新されたら通知するやつ
 *******************************************/

/*
 * パッケージ
 */
const rp = require('request-promise');
const cheerio = require('cheerio');
const logger = require('./logger');
const fs = require('fs');
const jsondiffpatch = require('jsondiffpatch');
require('date-util');
var yesterday = new Date().strtotime('-1 day').format('yyyy年mm月dd日更新');

/*
 * パラメータ
 */
const CONF = {
  kkt: {
    BAERERTOKEN: process.env.NODE_KKT_TOKEN, // kktのトークン
    VISIBILITY: 'public' // 公開範囲 "direct", "private", "unlisted" or "public"
  },
  url: {
    DCDSTARS: 'http://www.aikatsu.com/stars/',
    CARDLIST: 'http://www.aikatsu.com/stars/cardlist/'
  },
  RANK_THRESHOLD: 5, // 表示するランクの閾値
  target: [{
    uri: 'http://www.aikatsu.com/stars/ranking/series_brand_ranking.php?series=0900&r_type=brand&brand_id=1&p=1',
    title: '[MLH ピルエット]',
    path: './data/mlh.json'
  }, {
    uri: 'http://www.aikatsu.com/stars/ranking/series_brand_ranking.php?series=0900&r_type=brand&brand_id=9&p=1',
    title: '[RS ルネサンス]',
    path: './data/rs.json'
  }]
};

/*
 * プログラム
 */
function init() {
  if (!CONF.kkt.BAERERTOKEN) {
    logger.system.fatal('KKTトークン未設定');
    return false;
  }
  return true;
}

// スターズ公式に取りに行く
function getRankList(target) {
  const options = {
    uri: target.uri,
    transform: body => { return cheerio.load(body); }
  };
  // ランク情報。オブジェクト型と、diff用の文字列型配列
  let rankList = {
    old: { obj: [], str: [] },
    new: { obj: [], str: [] }
  };
  try {
    let oldList = JSON.parse(fs.readFileSync(target.path, 'utf8'));
    rankList.old.obj = oldList.obj;
    rankList.old.str = oldList.str;
    rankList.isLoaded = true;
  } catch (e) {
    logger.system.warn('ファイルが読めなかった。[File]' + target.path);
    rankList.isLoaded = false;
  }

  rp(options)
    .then($ => {
      // そのうちモジュールに切り分けたいね

      /* ランキング情報を取得 */
      $('.first-rank, .high-rank').each((index, val) => {
        rankList.new.obj.push({
          rank: parseInt($(val).find('.player-rank').eq(1).text().slice(0, -1), 10),
          name: $(val).find('.name').eq(1).text(),
          score: $(val).find('.number-of-brand').eq(1).text(),
          updateDate: $(val).find('.update').eq(1).text()
        });
        rankList.new.str.push(
          $(val).find('.player-rank').eq(1).text() + ' ' + $(val).find('.name').eq(1).text() + ' ' + $(val).find('.number-of-brand').eq(1).text()
        );
      });

      // 差分抽出
      let diff = jsondiffpatch.diff(rankList.old.str, rankList.new.str);
      logger.system.debug(JSON.stringify(diff, null, '  '));
      let diffmessage = '';
      if (diff) {
        Object.keys(diff).forEach(num => {
          if (num.match('_') === null) {
            logger.system.debug(JSON.stringify(rankList.new.obj[num], null, '  '));
            // 当日更新のものだけ表示する
            if (rankList.new.obj[num].updateDate === yesterday && rankList.new.obj[num].rank <= CONF.RANK_THRESHOLD) {
              diffmessage += diff[num][0] + '\n';
            } else {
              logger.system.info('更新あったが対象外：' + JSON.stringify(rankList.new.obj[num], null, '  '));
            }
          } else if (num.match(/\d/)) {
            // 減ったもの
          }
        });
      }

      fs.writeFile(target.path, JSON.stringify(rankList.new, null, '  '));
      return { 'diff': diff, 'rankList': rankList, 'diffmessage': diffmessage };
    })
    .then(diffInfo => {
      //logger.system.debug(JSON.stringify(diffInfo, null, '  '));
      /* 差分を投稿する */
      let katsu_content = '';

      // 投稿用メッセージ生成
      if (diffInfo.diffmessage !== '') {
        // 差分ありメッセージ
        katsu_content = '【bot】' + target.title + 'スコアランキング更新あり。\n' + diffInfo.diffmessage;
      } else {
        // 差分なしメッセージ
        katsu_content = '【bot】' + target.title + 'スコアランキング更新なし。';
      }
      // MASTODONの文字数制限に抑える
      katsu_content = katsu_content.substr(0, 499);
      logger.system.debug(JSON.stringify(katsu_content, null, '  '));

      let katsu_body = {
        'status': katsu_content,
        'in_reply_to_id': null,
        'media_ids': null,
        'sensitive': null,
        'spoiler_text': '',
        'visibility': CONF.kkt.VISIBILITY
      };
      // リクエストの生成
      let options = {
        method: 'POST',
        uri: 'https://kirakiratter.com/api/v1/statuses',
        body: katsu_body,
        headers: {
          'Authorization': 'Bearer ' + CONF.kkt.BAERERTOKEN,
          'Content-type': 'application/json'
        },
        json: true
      };

      // 旧ファイルが取れて、更新あった時だけカツするようにした
      if (rankList.isLoaded === true && diffInfo.diffmessage !== '') {
        rp(options)
          .then(parsedBody => {
            logger.system.info(parsedBody.url);
            logger.system.debug(parsedBody);
          })
          .catch(err => {
            logger.system.error(err);
          });
      } else {
        logger.system.info('更新なし');
      }
    })
    .catch(err => {
      logger.system.error(err);
    });
}

if (init()) {
  CONF.target.forEach(target => {
    getRankList(target);
  });
}
