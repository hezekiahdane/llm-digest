/**
 * Admin notification email — sent to the site admin when a contact form is submitted.
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
  Row,
  Section,
  Text,
} from '@react-email/components';
import type { ContactFormData } from '@/lib/validators/contact.schema';

interface ContactAdminEmailProps {
  data: ContactFormData;
}

export function ContactAdminEmail({ data }: ContactAdminEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>New contact request from {data.name}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>New Contact Request</Heading>
          <Section>
            <Row>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{data.name}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{data.email}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{data.company}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Business Type</Text>
              <Text style={styles.value}>{data.businessType}</Text>
            </Row>
            <Row>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{data.phone}</Text>
            </Row>
            {data.message && (
              <Row>
                <Text style={styles.label}>Message</Text>
                <Text style={styles.value}>{data.message}</Text>
              </Row>
            )}
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Sent via the contact form on your website.
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
    marginBottom: '24px',
    color: '#1e2939',
  },
  label: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    marginBottom: '2px',
  },
  value: {
    fontSize: '16px',
    color: '#374151',
    marginTop: '0',
    marginBottom: '16px',
  },
  hr: { borderColor: '#e5e7eb', margin: '24px 0' },
  footer: { fontSize: '12px', color: '#9ca3af' },
};
