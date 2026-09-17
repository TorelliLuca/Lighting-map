import { LegalDocumentPage } from "../components/legal/LegalDocumentPage"
import { cookiePolicy, privacyPolicy } from "../data/legalDocuments"

export default function PrivacyPolicy() {
  return <LegalDocumentPage document={privacyPolicy} alternate={cookiePolicy} />
}
