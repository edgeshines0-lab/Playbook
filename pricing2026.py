"""Edge Shines 2026 pricing + agreement policy, applied on top of the workbook extract.

The workbook still carries the old 2-/3-/4-year rate tables ($10/$8/$7 roofline, $7 stakes,
$50 strands). Edge Shines now sells ONE agreement: 3 years, $6/ft roofline, $6/ft ground
stakes, $30 per mini-light strand. build.py runs apply() on every build so a rebuild from the
old workbook can never bring the retired rates or terms back.
"""

TERM = '3-year'
ROOF, STAKE, STRAND = 6, 6, 30
PER_BUSH, PER_TREE = 5, 10


def _set(items, row, **fields):
    for it in items:
        if it.get('row') == row:
            it.update(fields)
            return
    raise KeyError(row)


def apply(D):
    # Rate tables: a single 3-year row.
    D['fast']['rates'] = [dict(term=TERM, roof=f'${ROOF} / linear foot', mini=f'${STRAND} / strand',
                               stake=f'${STAKE} / linear foot', row=18)]
    D['fast']['rateNote'] = ('2026 Edge Shines rate card. Every Christmas lighting agreement is 3 years. '
                             'Price add-ons, approved access charges and tax separately.')
    D['price']['title'] = 'LIGHTING RATE CARD · 2026 · 3-YEAR AGREEMENT'
    D['price']['sub'] = ('Current 2026 rates for the standard 3-year agreement. Confirm inventory, add-on '
                         'pricing and tax before quoting.')
    D['price']['rates'] = [dict(term=TERM, roof=ROOF, mini=STRAND, stake=STAKE, row=5)]
    c = D['price']['components']
    _set(c, 10, how=f'Total feet × ${ROOF}', example=f'150 ft × ${ROOF} = $900')
    _set(c, 11, how=f'Total approved mini strands × ${STRAND}', example=f'4 bushes × {PER_BUSH} strands × ${STRAND} = $600')
    _set(c, 12, how=f'Total approved mini strands × ${STRAND}', example=f'1 tree × {PER_TREE} strands × ${STRAND} = $300')
    _set(c, 13, how=f'Total stake footage × ${STAKE}', example=f'100 ft × ${STAKE} = $600')
    D['price']['example'] = dict(label='3-year agreement example',
                                 scope='150 ft roofline + 100 ft ground stakes + 20 mini strands',
                                 calc='$900 + $600 + $600',
                                 total='$2,100 per season before tax (50% deposit $1,050)')
    _set(D['price']['scoping'], 26, q='“Which fixed C9 color would you like?”')
    s = D['price']['safety']
    s[:] = [x.replace('Agreement and 40% cancellation depend on signed terms.',
                      'Every agreement is 3 years; 40% cancellation follows the signed terms.') for x in s]

    # Process text that referred to choosing a term.
    _set(D['fast']['routine'], 11, how=f'Multiply measured roofline and stake feet by ${ROOF}/ft and mini strands by ${STRAND}. '
                                       'Add wreaths, garland or approved special labor as separate items. Avoid undisclosed add-ons.')
    _set(D['fast']['checkpoint'], 28, why='Standard 50% deposit; every agreement is 3 years. Tax per current rules.',
         action='Confirm deposit and tax')
    _set(D['sop']['steps'], 13, stage='Price the 3-year agreement',
         do=f'Use the 2026 rate card: roofline ${ROOF}/ft, ground stakes ${STAKE}/ft, mini lights ${STRAND}/strand; '
            'price wreaths, garland and special access separately. Explain seasonal scope and the 3-year agreement before presenting the seasonal total.')
    _set(D['sop']['steps'], 14, do='Explain that every agreement is 3 years: the company invests in custom-fit materials in '
                                   'year one and returns for seasons two and three. Check any cancellation exception.')
    D['sop']['facts'] = ['Budget' if f == 'Budget + agreement term' else f for f in D['sop']['facts']]
    _set(D['measure']['steps'], 12, measure=f'Use the 2026 rate card (3-year agreement): roofline + ground-stake ft × ${ROOF}, '
                                            f'mini strands × ${STRAND}, plus counted greenery items.')
    D['measure']['checklist'] = ['Tax and discounts approved' if x.startswith('Chosen term') else x
                                 for x in D['measure']['checklist']]
    _set(D['flyra']['steps'], 8, detail='Roofline sections, footage and reliability, C9 colors, add-ons, design image, '
                                        '3-year agreement and anticipated installation date.')
    _set(D['flyra']['steps'], 11, detail='Confirm correct customer, property, 3-year plan length, seasonal price and '
                                         'subscription details; check for duplicates.')
    D['flyra']['notes'] = ['Approved seasonal price (3-year)' if n == 'Approved price & term' else n
                           for n in D['flyra']['notes']]

    # Knowledge base, objections and texts.
    _set(D['facts']['items'], 25, say='Every Christmas lighting agreement is 3 years: we install in season one and '
                                      'return in seasons two and three. It is the only agreement we offer.',
         check='Always 3 years')
    _set(D['facts']['items'], 24, say='Standard 50% deposit of the seasonal price reserves the season; the remaining '
                                      'seasonal balance is generally due upon completed installation. Each season is billed '
                                      'separately — the 3 seasons are never due upfront.')
    _set(D['obj']['items'], 11, next='Would it help if I showed you the seasonal price for your home?')
    _set(D['obj']['items'], 13, answer='Our program is built on a 3-year agreement because the first-year custom '
                                       'materials and installation are the largest investment. The 3-year agreement is what '
                                       'lets us keep the seasonal price at $6 a foot, and you only pay one season at a time.',
         next='Would it help to see the seasonal price for your home?')
    _set(D['obj']['items'], 28, answer='Absolutely. Is the main thing you’re considering the total price, how the design '
                                       'looks, or the 3-year agreement? I want to send you the information that’s actually useful.')
    _set(D['obj']['items'], 36, answer='We can discuss changes, though the 3-year price is built around the original '
                                       'custom-fitted design. New areas, colors or major revisions may require a revised quote.')
    _set(D['texts']['items'], 13, text='Hi [NAME]! Our 3-year agreement lets us custom-fit the materials in year one and '
                                       'handle the seasonal service again in seasons two and three. You pay one season at a '
                                       'time. I’m happy to go over the cancellation language before you decide.')
    _set(D['script']['lines'], 21, say='No problem. Is it the design, the investment, or the 3-year agreement you’re still '
                                       'thinking about? Let’s make sure I have the right information for you.')
    return D
