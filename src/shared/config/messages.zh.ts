import type { ZhWords } from '@/shared/i18n/words'

import type { messageWords, Words } from './messages'

// The student screens' messages in Simplified Chinese (Herman, 7 Oct 2026), code for code
// with messages.ts's customer table; terms from frontend-plan/notes/i18n-glossary.md.
// Values come through `r` (messages.ts's readers in Chinese), since this file may import
// nothing at run time: it is the Chinese chunk.

const GENERIC = '出了点问题。请刷新页面再试一次。'
const NETWORK = '无法连接服务器。请检查网络后再试。'
const EMAIL_FORMAT = '请输入像 name@example.com 这样的电子邮件地址。'

const CUSTOMER: Readonly<Record<string, Words>> = {
  overlap_mine: (d, _, r) =>
    r.givenBoth(
      r.textOf(d.names),
      r.rangeOf(d),
      (names, range) => `与 ${names} ${range}的课时间重叠。`,
    ),
  overlap_other: (d, _, r) => r.given(r.rangeOf(d), (range) => `与${range}的另一节课时间重叠。`),
  gap_after: (d, o, r) =>
    r.givenBoth(
      r.timeOf(d.ends_at),
      r.gapOf(o),
      (time, gap) => `这节课离${time}结束的课太近。教练需要 ${gap} 赶到下一节课。`,
    ),
  gap_before: (d, o, r) =>
    r.givenBoth(
      r.timeOf(d.starts_at),
      r.gapOf(o),
      (time, gap) => `这节课结束时离${time}的课太近。教练需要 ${gap} 赶到下一节课。`,
    ),
  outside_open_hours: '教练在这个时间没空。',
  outside_window: (_, o, r) =>
    r.given(r.countOf(o.windowWeeks), (weeks) => `最多只能预约 ${weeks} 周以内的课。`),
  past: '这个时间已经开始了。',
  credit_exceeded: '请先付清当前配套，才能预约更多课。',
  repeat_conflict: (d, _, r) =>
    r.given(
      r.datesOf(d.dates),
      (dates) => `这几周的时间有冲突：${dates}。没有预约任何课。请换个时间，或关掉每周重复。`,
    ),
  group_inactive: '教练已暂停这个小组的预约。请联系教练。',
  too_many_changes: (d, _, r) =>
    r.given(
      r.countOf(d.limit),
      (limit) => `你在过去 24 小时内已预约或取消了 ${limit} 次。请稍后再试，或联系教练。`,
    ),
  locked: (_, o, r) =>
    r.given(r.countOf(o.cutoffHours), (hours) => `离上课不到 ${hours} 小时，所以不能取消。`),
  not_booked: '这节课已不在预约中。请刷新查看最新情况。',
  not_approved: '教练还没有批准你的账户。',
  invalid_login: '用户名或密码错误。',
  too_many_attempts: '尝试次数太多。请等 15 分钟后再试。',
  over_request_rate_limit: '这个网络的尝试次数太多。请等几分钟后再试。',
  captcha_required: '请先完成上面的安全验证，然后再试一次。',
  captcha_failed: '安全验证没有成功。请重新验证，然后再试一次。',
  captcha_unavailable: '无法加载安全验证。请检查网络并刷新页面。',
  network: NETWORK,
  not_your_group: GENERIC,
  not_your_booking: GENERIC,
  invalid_repeat: GENERIC,
  invalid_length: GENERIC,
  invalid_reason: GENERIC,
  not_found: GENERIC,
  weak_password: (_, __, r) => `密码至少要有 ${r.minPasswordLength} 个字符。`,
  same_password: '这是你现在的密码。请换一个不同的密码。',
  user_already_exists: '这个电子邮件已经有账户了。请登录，或使用“忘记用户名或密码？”。',
  email_address_invalid: EMAIL_FORMAT,
  over_email_send_rate_limit: '暂时不能再发电子邮件。请等几分钟后再试。',
  username_taken: '这个用户名已经有人用了。',
  invalid_username: '请用 3 到 30 个小写字母、数字、点或下划线。',
  username_required: '请输入用户名。',
  password_required: '请输入密码。',
  name_required: '请输入你的名字。',
  phone_required: '请输入你的电话号码。',
  password_mismatch: '两次输入的密码不一样。请输入相同的密码两次。',
}

export default {
  key: 'messages',
  words: {
    generic: GENERIC,
    network: NETWORK,
    noGroups: '教练还没有为你安排课程。请联系教练开始上课。',
    noGroupsCoach: '学员会在这里看到他们的课。你的教练账户没有自己的课。',
    dayFullyBooked: '这天已经约满了。请试试别的日子。',
    coachAwayDay: '教练这天没空。请试试别的日子。',
    coachAway: (ranges) => `教练在${ranges.join('和')}没空。`,
    customer: CUSTOMER,
  },
} satisfies ZhWords<typeof messageWords>
