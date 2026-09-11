import {
  isListingContactCard,
  listingContactCardEditRecord,
  listingContactCardDetails,
  listingContactNarration,
  listingContactScript,
} from './listing-contact-card';

describe('listing contact card', () => {
  const legacyCard = {
    title: 'Contact Edmond Mbadu',
    subtitle: 'Edmond Mbadu · Executive Realty Services · Phone: 2156877614',
    notes: [
      'Edmond Mbadu',
      'Executive Realty Services',
      'Phone: 2156877614',
      'Email: mbadungoma@gmail.com',
      'Active MLS status gibberish that should never become the invitation.',
    ].join('\n'),
    tags: ['listing', 'real-estate', 'group-next-step'],
    listingPresentation: { groupKey: 'next-step' },
  };

  it('recognizes new and already-generated real-estate contact cards', () => {
    expect(isListingContactCard(legacyCard)).toBeTrue();
    expect(isListingContactCard({ ...legacyCard, title: 'The next step', tags: ['group-next-step', 'rental'] })).toBeFalse();
    expect(isListingContactCard({ title: 'Reach out', tags: ['listing-contact'] })).toBeTrue();
  });

  it('recognizes a reusable contact card outside real estate', () => {
    expect(isListingContactCard({ title: 'Contact Maya', tags: ['contact-card'] })).toBeTrue();
    expect(listingContactNarration({ title: 'Contact Maya', tags: ['contact-card'], notes: 'Email: maya@example.com' }))
      .toContain('continue the conversation');
  });

  it('extracts only the useful contact details from legacy copy', () => {
    expect(listingContactCardDetails(legacyCard)).toEqual({
      name: 'Edmond Mbadu',
      agency: 'Executive Realty Services',
      phone: '2156877614',
      email: 'mbadungoma@gmail.com',
      phoneHref: 'tel:2156877614',
      emailHref: 'mailto:mbadungoma@gmail.com',
    });
  });

  it('removes a duplicated agent name and trailing contact label from malformed agency copy', () => {
    const details = listingContactCardDetails({
      title: 'Contact Edmond Mbadu',
      subtitle: 'Questions about this home?',
      notes: [
        'Interested in this home? Contact Edmond Mbadu to ask a question or arrange a private showing.',
        'Edmond Mbadu',
        'Edmond Mbadu Executive Realty Services Phone:',
        'Phone: 12156877614',
        'Email: mbadungoma@gmail.com',
      ].join('\n'),
      tags: ['listing-contact'],
    });

    expect(details.agency).toBe('Executive Realty Services');
    expect(details.phone).toBe('12156877614');
    expect(details.email).toBe('mbadungoma@gmail.com');
  });

  it('uses a short invitation for narration and excludes inherited MLS prose', () => {
    const narration = listingContactNarration(legacyCard);
    expect(narration).toContain('Interested in this home?');
    expect(narration).toContain('Contact Edmond Mbadu');
    expect(narration).toContain('arrange a private showing');
    expect(narration).not.toContain('MLS status gibberish');
  });

  it('uses an authored contact-card script instead of generated contact copy', () => {
    const script = 'This is the exact closing narration the author wants visitors to hear.';
    expect(listingContactScript({
      ...legacyCard,
      notes: script,
    })).toBe(script);
  });

  it('preserves an explicit script even when it includes labeled contact details', () => {
    const script = 'Please call when ready. Phone: 484-255-9613\nEmail: jim@example.com';
    expect(listingContactScript({
      ...legacyCard,
      stackNarration: script,
    })).toBe(script);
  });

  it('keeps generated narration as the fallback for legacy contact metadata notes', () => {
    expect(listingContactScript(legacyCard)).toBe(listingContactNarration(legacyCard));
  });

  it('prefers structured contact details so script edits cannot break actions', () => {
    expect(listingContactCardDetails({
      title: 'Let us connect',
      notes: 'A completely editable narration with no embedded contact metadata.',
      tags: ['contact-card'],
      contactDetails: {
        name: 'Jim Walker',
        organization: 'Mind Palace, Inc',
        phone: '(484) 255-9613',
        email: 'JIM.WALKER@MINDPALACE.COM',
      },
    })).toEqual({
      name: 'Jim Walker',
      agency: 'Mind Palace, Inc',
      phone: '(484) 255-9613',
      email: 'jim.walker@mindpalace.com',
      phoneHref: 'tel:4842559613',
      emailHref: 'mailto:jim.walker@mindpalace.com',
    });
  });

  it('prefers legacy subtitle contact data over arbitrary authored narration', () => {
    expect(listingContactCardDetails({
      title: 'Contact Jim Walker',
      subtitle: 'Mind Palace, Inc · Phone: 4842559613 · Email: jim.walker@mindpalace.com',
      notes: 'At the shore, this seaside gem will not be available for long.',
      tags: ['contact-card'],
    })).toEqual({
      name: 'Jim Walker',
      agency: 'Mind Palace, Inc',
      phone: '4842559613',
      email: 'jim.walker@mindpalace.com',
      phoneHref: 'tel:4842559613',
      emailHref: 'mailto:jim.walker@mindpalace.com',
    });
  });

  it('round-trips edited contact fields into working call and email actions', () => {
    const edited = listingContactCardEditRecord({
      name: '  Taylor   Thornton ',
      organization: ' Northstar Realty ',
      phone: ' (303) 555-0198 ',
      email: ' TAYLOR@EXAMPLE.COM ',
      script: 'Call or email me with any questions about this home.',
      tags: ['listing-contact', 'real-estate'],
    });

    expect(edited.title).toBe('Contact Taylor Thornton');
    expect(edited.subtitle).toBe('Northstar Realty · Phone: (303) 555-0198 · Email: taylor@example.com');
    expect(edited.notes).toBe('Call or email me with any questions about this home.');
    expect(edited.stackNarration).toBe(edited.notes);
    expect(listingContactCardDetails(edited)).toEqual({
      name: 'Taylor Thornton',
      agency: 'Northstar Realty',
      phone: '(303) 555-0198',
      email: 'taylor@example.com',
      phoneHref: 'tel:3035550198',
      emailHref: 'mailto:taylor@example.com',
    });
  });

  it('generates a useful narration when an edited Contact Card script is left blank', () => {
    const edited = listingContactCardEditRecord({
      name: 'Taylor Thornton',
      organization: '',
      phone: '',
      email: 'taylor@example.com',
      script: '   ',
      tags: ['listing-contact', 'real-estate'],
    });

    expect(edited.stackNarration).toContain('Interested in this home?');
    expect(edited.stackNarration).toContain('taylor@example.com');
    expect(edited.notes).toBe(edited.stackNarration);
  });
});
