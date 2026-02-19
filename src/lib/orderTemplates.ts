interface LanguageTemplate {
  greeting: string
  itemPrefix: string
  quantitySuffix: (qty: number) => string
  closing: string
  langCode: string
}

const templates: Record<string, LanguageTemplate> = {
  Korea: {
    greeting: '안녕하세요, 주문하겠습니다.',
    itemPrefix: '',
    quantitySuffix: (qty) => ` ${qty}개`,
    closing: '감사합니다.',
    langCode: 'ko',
  },
  Vietnam: {
    greeting: 'Xin chào, cho tôi gọi món.',
    itemPrefix: '',
    quantitySuffix: (qty) => ` ${qty} phần`,
    closing: 'Cảm ơn.',
    langCode: 'vi',
  },
  Thailand: {
    greeting: 'สวัสดีครับ/ค่ะ ขอสั่งอาหารครับ/ค่ะ',
    itemPrefix: '',
    quantitySuffix: (qty) => ` ${qty} จาน`,
    closing: 'ขอบคุณครับ/ค่ะ',
    langCode: 'th',
  },
  Japan: {
    greeting: 'すみません、注文お願いします。',
    itemPrefix: '',
    quantitySuffix: (qty) => ` ${qty}つ`,
    closing: 'ありがとうございます。',
    langCode: 'ja',
  },
  Indonesia: {
    greeting: 'Permisi, saya mau pesan.',
    itemPrefix: '',
    quantitySuffix: (qty) => ` ${qty} porsi`,
    closing: 'Terima kasih.',
    langCode: 'id',
  },
}

const fallbackTemplate: LanguageTemplate = {
  greeting: 'Hello, I would like to order:',
  itemPrefix: '',
  quantitySuffix: (qty) => ` x${qty}`,
  closing: 'Thank you.',
  langCode: 'en',
}

export function getTemplate(country: string): LanguageTemplate {
  return templates[country] || fallbackTemplate
}

export function buildOrderPhrase(
  items: { name: string; quantity: number }[],
  country: string,
): string {
  const t = getTemplate(country)
  const lines = items.map(
    (item) => `${t.itemPrefix}${item.name}${t.quantitySuffix(item.quantity)}`,
  )
  return `${t.greeting}\n${lines.join('\n')}\n${t.closing}`
}

export function buildShowText(
  items: { nameLocal: string; quantity: number }[],
  country: string,
): string {
  const t = getTemplate(country)
  const lines = items.map(
    (item) => `${item.nameLocal}${t.quantitySuffix(item.quantity)}`,
  )
  return `${t.greeting}\n\n${lines.join('\n')}\n\n${t.closing}`
}

export function getLangCode(country: string): string {
  return (templates[country] || fallbackTemplate).langCode
}
