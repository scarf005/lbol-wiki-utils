import * as s from "https://esm.sh/@nrsk/sigma@3.8.0"
import { camelCase } from "https://deno.land/x/case@2.2.0/mod.ts"
import { partition } from "jsr:@std/collections@^0.224.2"

const exampleData =
    `{CardConfig Index=2010, Id=RainbowMarket, Order=10, AutoPerform=True, Perform=[], GunName=Simple1,
GunNameBurst=Simple1, DebugLevel=0, Revealable=True, IsPooled=True, FindInBattle=True,
HideMesuem=False, IsUpgradable=True, Rarity=Rare, Type=Ability, TargetType=Self, Colors=[W, U],
IsXCost=False, Cost=1WU, UpgradedCost=1H:HWU, MoneyCost=null, Damage=null, UpgradedDamage=null,
Block=null, UpgradedBlock=null, Shield=null, UpgradedShield=null, Value1=1, UpgradedValue1=null,
Value2=null, UpgradedValue2=null, Mana=null, UpgradedMana=null, Scry=null, UpgradedScry=null,
ToolPlayableTimes=null, Loyalty=null, UpgradedLoyalty=null, PassiveCost=null,
UpgradedPassiveCost=null, ActiveCost=null, UpgradedActiveCost=null, UltimateCost=null,
UpgradedUltimateCost=null, Keywords=None, UpgradedKeywords=None, EmptyDescription=False,
RelativeKeyword=Exile, UpgradedRelativeKeyword=Exile, RelativeEffects=[],
UpgradedRelativeEffects=[], RelativeCards=[], UpgradedRelativeCards=[], Owner=, ImageId=,
UpgradeImageId=, Unfinished=False, Illustrator=灰木, SubIllustrator=[]}`

const spaces = s.optional(s.whitespace())
const comma = s.sequence(s.string(","), spaces)

const integer = s.takeLeft(s.integer(), s.lookahead(s.oneOf("=,]}")))
const string = s.map(s.many1(s.noneOf("=,]}")), (xs) => xs.join(""))

const boolean = s.choice(
    s.mapTo(s.string("True"), true),
    s.mapTo(s.string("False"), false),
)
const nullValue = s.mapTo(s.string("null"), null)

const array = s.takeMid(
    s.string("["),
    s.optional(s.sepBy(string, comma)),
    s.string("]"),
)

const value = s.choice(boolean, nullValue, array, integer, string)

const key = s.map(s.many(s.noneOf("=")), (x) => camelCase(x.join("")))

const entry = s.takeSides(key, s.string("="), s.optional(value))

const cardName = s.takeLeft(s.takeUntil(s.any(), s.string("\n")), spaces)

// s.map(s.many1(s.noneOf(":")), (xs) => xs.join("")),
// s.sequence(s.string(":"), spaces),

const cardConfig = s.sequence(
    cardName,
    s.map(
        s.takeMid(
            s.string("{"),
            s.sepBy(entry, comma),
            s.sequence(s.optional(comma), s.string("}")),
        ),
        (x) => Object.fromEntries(x) as Record<string, string>,
    ),
)

export type CardConfig = {
    index: number
    id: string
    order: number
    autoPerform: boolean
    perform: string[]
    gunName: string
    gunNameBurst: string
    debugLevel: number
    revealable: boolean
    isPooled: boolean
    findInBattle: boolean
    hideMesuem: boolean
    isUpgradable: boolean
    rarity: string
    type: string
    targetType: string
    colors: string[]
    isXCost: boolean
    cost: string
    upgradedCost: string
    moneyCost: string | null
}

console.log(
    s.run(
        s.takeLeft(
            s.map(s.many1(s.noneOf(":")), (xs) => xs.join("")),
            s.sequence(s.string(":"), spaces),
        ),
    )
        .with("Hakurei Amulet: \n"),
)

if (import.meta.main) {
    const data = await Deno.readTextFile("demo/CardConfig.txt")
    const lines = data.trim().split("------------------------")
        .filter((x) => x.length).map((x) => x.trim())
    const parser = s.run(cardConfig)
    const [oks, fails] = partition(
        lines.map((line) => ({ line, ...parser.with(line) })),
        (x) => x.isOk,
    )
    console.log(oks)
    console.log(fails.map((x) => {
        // use span to get the error position
        const error = x.line.slice(x.span[0], x.span[1])
        return { ...x, error }
    }))
    console.log(`oks: ${oks.length}, fails: ${fails.length}`)
}
