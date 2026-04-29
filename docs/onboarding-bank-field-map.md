# Onboarding Bank Field Map

| Field Label | Onboarding Section | Form Key | DB Column | Used In | Required? | Status |
|---|---|---|---|---|---|---|
| Customer Name | Personal Information | customerName | customer_name | Prequal, Loan App, Readiness, Advisor | Yes | Mapped |
| Nationality | Personal Information | nationality | nationality | Prequal, Loan App | Yes | Mapped |
| Email | Contact Information | email | users.email | Advisor, Loan App | Yes | Mapped |
| Employment Type | Employment & Income | employmentType | employment_type | All | Yes | Mapped |
| Other Assets | Savings & Assets | otherAssets | other_assets | Loan App, Readiness | Yes | Added column |
| Source of Down Payment | Savings & Assets | sourceOfDownPayment | source_of_down_payment | Prequal, Loan App | Yes | Added column |
| Purchase Price | Goals & Loan Details | purchasePrice | purchase_price | Loan App | Yes | Added column |
| Borrower Contribution | Goals & Loan Details | borrowerContribution | borrower_contribution | Loan App | Yes | Added column |
| Security Offered | Goals & Loan Details | securityOffered | security_offered | Loan App | Yes | Added column |
| Security Value | Goals & Loan Details | securityValue | security_value | Loan App | Yes | Added column |
| Tax Returns Available | Goals & Loan Details | hasTaxReturns | has_tax_returns | Prequal, Loan App | Yes | Added column |
