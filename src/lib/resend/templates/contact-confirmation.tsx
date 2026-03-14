/**
 * User confirmation email — sent to the user after submitting the contact form.
 *
 * Uses React Email components, which escape all values by default (no XSS risk).
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import { siteConfig } from '@/config/site';

interface ContactConfirmationEmailProps {
  name: string;
}

export function ContactConfirmationEmail({
  name,
}: ContactConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        We received your message — the {siteConfig.name} team will be in touch
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>
            Thanks for reaching out, {name}!
          </Heading>
          <Text style={styles.text}>
            We have received your message and a member of our team will get back
            to you within one business day.
          </Text>
          <Text style={styles.text}>
            If you have anything urgent, please reply directly to this email and
            we will prioritise your request.
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Best regards,
            <br />
            The {siteConfig.name} Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' },
  container: {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '32px',
    maxWidth: '600px',
    borderRadius: '8px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#1e2939',
  },
  text: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '24px',
    marginBottom: '16px',
  },
  hr: { borderColor: '#e5e7eb', margin: '24px 0' },
  footer: { fontSize: '14px', color: '#6b7280', lineHeight: '22px' },
};
