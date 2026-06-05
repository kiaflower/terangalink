
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({

  host: 'mail.teranga-link.com',

  port: 465,

  secure: true,

  auth: {

    user: 'contact@teranga-link.com',

    pass: '0330-Kiaqueen',

  },

})

const info = await transporter.sendMail({

  from: '"TerangaLink" <contact@teranga-link.com>',

  to: 'workwith.kia@yahoo.com',

  subject: 'Test TerangaLink ✅',

  html: '<p>Si tu vois ça, Nodemailer fonctionne !</p>',

})

console.log('✅ Email envoyé !', info.messageId)

