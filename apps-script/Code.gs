// The swimclass mailer (TECH_SPEC §8): sends the site's emails from the Gmail account that
// owns this Apps Script project. Every 5 minutes `poll` asks the mail-queue Edge Function for
// the emails waiting in the outbox, sends them, and reports back which went out.
//
// Script Properties (Project Settings → Script Properties), see README.md:
//   MAIL_QUEUE_URL  https://<project-ref>.supabase.co/functions/v1/mail-queue
//   MAIL_TOKEN      the same value as the Edge Function's MAIL_TOKEN secret
//   SENDER_NAME     the business name, shown as the sender
//
// Gmail allows 100 recipients a day (each email has one). When today's quota is used up,
// `poll` sends nothing and the emails wait in the outbox for the next day, oldest first
// (PRD BR-37). Run `install` once by hand to start the 5-minute trigger, `uninstall` to stop it.

function poll() {
  const p = PropertiesService.getScriptProperties()
  const left = MailApp.getRemainingDailyQuota() // 100 recipients/day on Gmail
  if (left <= 0) return
  const claim = call_(p, { action: 'claim', limit: Math.min(left, 20) })
  const results = claim.emails.map(function (e) {
    try {
      MailApp.sendEmail({
        to: e.to_email,
        subject: e.subject,
        body: e.body_text,
        htmlBody: e.body_html || undefined,
        name: p.getProperty('SENDER_NAME'),
      })
      return { id: e.id, ok: true }
    } catch (err) {
      return { id: e.id, ok: false, error: String(err).slice(0, 500) }
    }
  })
  if (results.length) call_(p, { action: 'ack', results: results })
}

function call_(p, body) {
  const res = UrlFetchApp.fetch(p.getProperty('MAIL_QUEUE_URL'), {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-mail-token': p.getProperty('MAIL_TOKEN') },
    payload: JSON.stringify(body),
  })
  if (res.getResponseCode() !== 200) {
    throw new Error('mail-queue answered ' + res.getResponseCode() + ': ' + res.getContentText())
  }
  return JSON.parse(res.getContentText())
}

// Run once by hand: replaces any earlier trigger with one that runs poll every 5 minutes.
function install() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t)
  })
  ScriptApp.newTrigger('poll').timeBased().everyMinutes(5).create()
}

// Run by hand to stop sending: deletes the trigger. Emails then wait in the outbox.
function uninstall() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    ScriptApp.deleteTrigger(t)
  })
}
