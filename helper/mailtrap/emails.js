const { mailtrapClient, sender } = require("./mailtrap.config");
const { VERIFICATION_EMAIL_TEMPLATE, PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } = require("./emailTemplates");

const sendVerficationEmail = async (email, verificationToken) => {
    const recipient = [{email}]

    try {
        const respone = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: "Verify your email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
            category: "Email Verification"
        })

        console.log("Email sent successfully", respone)
    }catch (error){
        console.log('Error sending verification', error)
        throw new Error(`Error sending verification email: ${error}`)
    }
}

const sendWelcomeEmail = async(email, name) => {
    const recipient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            template_uuid: "67c022e4-dd60-4c36-a8f9-2ed729a03a0a",
            template_variables: {
                "company_info_name": "Shopify",
                "name": name
            }
        });

        console.log("Welcome email sent successfully!", response)
    }catch(error){
        console.log('Error sending verification', error)
        throw new Error(`Error sending verification email: ${error}`)
    }
}

const sendPasswordResetEmail = async (email, resetURL) => {
    const recipient = [{email}]

    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: 'Reset your password',
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
            category: 'Password Reset',
        })
    } catch (error) {
        console.error('Error sending password reset email', error)

        throw new Error (`Error sending password reset email: ${error}`);
    }
}

const sendResetSuccessEmail = async(email) => {
    const recipient = [{email}]

    try{
        const response = await mailtrapClient.send({
            from: sender,
            to: recipient,
            subject: 'Password Reset successful',
            html: PASSWORD_RESET_SUCCESS_TEMPLATE,
            category: 'Password Reset'
        });
        console.log("Password reset email sent successfully", response)
    } catch(error){
        console.error('Error sending password reset email', error)

        throw new Error (`Error sending password reset email: ${error}`);
    }
}
module.exports = {sendVerficationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail};