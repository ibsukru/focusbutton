import Link from "next/link"
import styles from "./page.module.scss"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <Link href={`/`} className={styles.back}>
        <ArrowLeft /> Back
      </Link>
      <h1>Privacy Policy</h1>

      <p>
        At FocusButton, we take your privacy seriously. This policy outlines how
        we handle your data and explains our commitment to protecting your
        privacy.
      </p>

      <h2>Data Collection</h2>
      <p>
        We collect minimal data necessary for the functioning of the extension:
      </p>
      <ul>
        <li>Timer settings and preferences</li>
        <li>Basic usage statistics to improve the service</li>
        <li>Extension settings and configurations</li>
        <li>Technical information about your browser environment</li>
      </ul>

      <h2>Data Storage</h2>
      <p>
        All timer data is stored locally on your device using Chrome&apos;s
        storage API. We do not store any personal information on our servers.
      </p>
      <p>
        Your preferences and settings are stored locally and sync across your
        devices if you have Chrome sync enabled. This data is encrypted and
        protected by Chrome&apos;s built-in security features.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        We use Google Analytics to understand how users interact with our
        extension. This helps us improve the user experience and fix issues. The
        analytics data is anonymized and does not contain any personally
        identifiable information.
      </p>

      <h2>Browser Permissions</h2>
      <p>
        FocusButton requires certain browser permissions to function properly:
      </p>
      <ul>
        <li>Storage access - to save your timer settings and preferences</li>
        <li>Notifications - to alert you when your focus session ends</li>
        <li>Audio playback - for timer completion sounds</li>
        <li>Background processing - to maintain timer accuracy</li>
      </ul>

      <h2>Data Security</h2>
      <p>We implement appropriate security measures to protect your data:</p>
      <ul>
        <li>All data is stored locally on your device</li>
        <li>No sensitive information is transmitted to external servers</li>
        <li>
          Chrome&apos;s built-in security features protect your synced data
        </li>
        <li>Regular security audits and updates</li>
      </ul>

      <h2>Updates to Privacy Policy</h2>
      <p>
        We may update this privacy policy from time to time to reflect changes
        in our practices or for other operational, legal, or regulatory reasons.
        We will notify users of any material changes through the extension or
        our website.
      </p>

      <h2>Contact</h2>
      <p>
        If you have any questions about our privacy practices, please contact us
        at ibsukru@gmail.com. We are committed to addressing any concerns you
        may have about your privacy and our data practices.
      </p>
    </div>
  )
}
