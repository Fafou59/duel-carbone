import { describe, expect, it } from 'vitest'
import { formaterDate, formaterEmpreinte, formaterMultiple, formaterRapport, queDevant } from './format.ts'

describe("Mise en forme d'une empreinte carbone", () => {
  it('affiche en grammes sous 1 kg, sans décimale', () => {
    expect(formaterEmpreinte(0.3105)).toBe('311 g CO2e')
    expect(formaterEmpreinte(0.0025)).toBe('3 g CO2e')
  })

  it('affiche en kg avec une décimale entre 1 et 100 kg, virgule à la française', () => {
    expect(formaterEmpreinte(3.361)).toBe('3,4 kg CO2e')
    expect(formaterEmpreinte(26.18)).toBe('26,2 kg CO2e')
  })

  it("n'affiche pas de décimale inutile", () => {
    expect(formaterEmpreinte(5)).toBe('5 kg CO2e')
  })

  it('affiche en kg sans décimale entre 100 kg et 1 t', () => {
    expect(formaterEmpreinte(369.7)).toBe('370 kg CO2e')
  })

  it('affiche en tonnes au-delà de 1 000 kg', () => {
    expect(formaterEmpreinte(2060)).toBe('2,1 t CO2e')
    // Séparateur des milliers à la française : une espace fine insécable (U+202F).
    expect(formaterEmpreinte(430_000_000)).toBe('430\u202f000 t CO2e')
  })

  it('affiche en millions de tonnes au-delà d’un million de tonnes (les agrégats nationaux)', () => {
    expect(formaterEmpreinte(29_500_000_000)).toBe('29,5 millions de t CO2e')
    expect(formaterEmpreinte(1_200_000_000)).toBe('1,2 million de t CO2e')
  })

  it('abrège les millions de tonnes en « Mt » dans un tableau, où la place manque sur téléphone', () => {
    expect(formaterEmpreinte(29_500_000_000, { co2e: false })).toBe('29,5 Mt')
  })

  it('affiche « < 1 g » plutôt que « 0 g » pour une valeur minuscule mais réelle', () => {
    expect(formaterEmpreinte(0.00002)).toBe('< 1 g CO2e')
    expect(formaterEmpreinte(0.00002, { co2e: false })).toBe('< 1 g')
  })

  it('affiche « 0 g » pour une valeur réellement nulle', () => {
    expect(formaterEmpreinte(0)).toBe('0 g CO2e')
  })

  it('évite « 1 000 g » en passant au kilo', () => {
    expect(formaterEmpreinte(0.9996)).toBe('1 kg CO2e')
  })

  it('garde le signe moins pour une fin de vie négative', () => {
    expect(formaterEmpreinte(-44.64)).toBe('−44,6 kg CO2e')
  })

  it("peut omettre l'unité CO2e (dans un tableau déjà titré)", () => {
    expect(formaterEmpreinte(3.361, { co2e: false })).toBe('3,4 kg')
  })
})

describe("Mise en forme d'un Rapport", () => {
  it('arrondit à l’unité à partir de ×10', () => {
    expect(formaterRapport(10.8)).toBe('×11')
  })

  it('garde une décimale sous ×10', () => {
    expect(formaterRapport(1.587)).toBe('×1,6')
    expect(formaterRapport(3)).toBe('×3')
  })
})

describe('Élision de « que »', () => {
  it('élide devant une voyelle ou un h, et met une minuscule', () => {
    expect(queDevant('Acheter un micro-ondes')).toBe("qu'acheter un micro-ondes")
    expect(queDevant('Habiller un enfant')).toBe("qu'habiller un enfant")
  })

  it("n'élide pas devant une consonne", () => {
    expect(queDevant('Manger un avocat')).toBe('que manger un avocat')
  })
})

describe("Mise en forme d'un multiple (équivalence « 1 A = x B »)", () => {
  it('garde toujours une décimale significative', () => {
    expect(formaterMultiple(10.83)).toBe('10,8')
    expect(formaterMultiple(25.7)).toBe('25,7')
    expect(formaterMultiple(2)).toBe('2')
  })

  it('sépare les milliers à la française', () => {
    expect(formaterMultiple(1234.5)).toBe('1 234,5')
  })
})

describe("Mise en forme d'une date", () => {
  it('écrit une date AAAA-MM-JJ en toutes lettres, à la française', () => {
    expect(formaterDate('2026-11-09')).toBe('9 novembre 2026')
    expect(formaterDate('2027-01-01')).toBe('1er janvier 2027')
  })
})
