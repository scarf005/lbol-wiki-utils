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

const terminator = s.lookahead(s.oneOf("=,]}"))
const spaces = s.optional(s.whitespace())
const comma = s.sequence(s.string(","), spaces)
const nullValue = s.mapTo(s.string("null"), null)
const boolean = s.sequence(
    s.choice(
        s.mapTo(s.string("True"), true),
        s.mapTo(s.string("False"), false),
    ),
    terminator,
)
// , Order=10, AutoPerform=True, Perform=[[2, MoonB]]
const string = s.map(s.many1(s.noneOf("=,]}")), (xs) => xs.join(""))
const integer = s.takeLeft(s.integer(), terminator)

const grammar = s.grammar({
    array() {
        return s.takeMid(
            s.string("["),
            s.optional(s.sepBy(this.value, comma)),
            s.string("]"),
        )
    },
    value() {
        return s.choice(this.array, boolean, nullValue, integer, string)
    },
})
const array = grammar.array
const value = grammar.value

const key = s.map(s.many(s.noneOf("=")), (x) => camelCase(x.join("")))

const entry = s.takeSides(key, s.string("="), s.optional(value))

const cardName = s.takeLeft(
    s.map(s.takeUntil(s.any(), s.string("\n")), ([xs]) => xs.join("")),
    spaces,
)

const cardConfig = s.map(
    s.takeMid(
        s.string("{"),
        s.sepBy(entry, comma),
        s.sequence(s.optional(comma), s.string("}")),
    ),
    (x) => Object.fromEntries(x) as Record<string, string>,
)

const cardConfigEntry = s.sequence(cardName, cardConfig)

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

if (import.meta.main) {
    const data = await Deno.readTextFile("demo/CardConfig.txt")
    const lines = data.trim().split("------------------------")
        .filter((x) => x.length).map((x) => x.trim())

    // const lines = [
    //     `"True Full Moon:
    //     {CardConfig Index=1316,Id=TrueMoon}`,
    // ]
    const parser = s.run(cardConfigEntry)
    const [oks, fails] = partition(
        lines.map((line) => ({ line, ...parser.with(line) })),
        (x) => x.isOk,
    )
    console.log(oks)
    console.log(fails.map((x) => {
        const error = x.line.slice(...x.span)
        const errorMessage = `${x.line.slice(0, x.span[0])}<<${error}>>`
        return { ...x, errorMessage }
    }))
    console.log(`oks: ${oks.length}, fails: ${fails.length}`)

    console.log(
        s.run(cardConfig).with(
            `{CardConfig Index=656, Id=DollZuzhou, Order=10, AutoPerform=True, Perform=[], GunName=Simple1,\n" +
      "GunNameBurst=Simple1, DebugLevel=2, Revealable=True, IsPooled=True, FindInBattle=True,\n" +
      "HideMesuem=False, IsUpgradable=True, Rarity=Uncommon, Type=Skill, TargetType=Nobody, Colors=[B],\n" +
      "IsXCost=False, Cost=2B, UpgradedCost=null, MoneyCost=null, Damage=null, UpgradedDamage=null,\n" +
      "Block=null, UpgradedBlock=null, Shield=null, UpgradedShield=null, Value1=null, UpgradedValue1=null,\n" +
      "Value2=null, UpgradedValue2=null, Mana=null, UpgradedMana=null, Scry=null, UpgradedScry=null,\n" +
      "ToolPlayableTimes=null, Loyalty=null, UpgradedLoyalty=null, PassiveCost=null,\n" +
      "UpgradedPassiveCost=null, ActiveCost=null, UpgradedActiveCost=null, UltimateCost=null,\n" +
      "UpgradedUltimateCost=null, Keywords=None, UpgradedKeywords=None, EmptyDescription=False,\n" +
      "RelativeKeyword=None, UpgradedRelativeKeyword=None, RelativeEffects=[], UpgradedRelativeEffects=[],\n" +
      "RelativeCards=[], UpgradedRelativeCards=[], Owner=Alice, ImageId=, UpgradeImageId=,\n" +
      "Unfinished=False, Illustrator=三折塔, SubIllustrator=[]}`,
        ),
    )
}
