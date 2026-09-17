import { LegalDocumentPage } from "../components/legal/LegalDocumentPage"
import { cookiePolicy, privacyPolicy } from "../data/legalDocuments"

export default function CookiePolicy() {
  return <LegalDocumentPage document={cookiePolicy} alternate={privacyPolicy} />
}
