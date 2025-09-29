const documentData = {
  categories: [
    {
      id: 1,
      title: "기본",
      items: [
        {
          title: "과정 소개 및 컨셉",
          content: {
            basic: `0. 리액트를 위한 클린 코드는 무엇일까?
  - 리액트를 잘 사용(활용)할 수 있는 방법과 실수를 방지하는 것
  - 좋은 코드와 나쁜 코드를 통해 모범 사례와 안티패턴을 파악

 1. 강의 대상
  - 클론코딩으로 간단한 리액트 웹 앱을 따라만들기만 하는 입문자
  - 이제 웹 프론트엔드 개발자로 입문하려는 입문자
  - 리액트로 앱을 만드는 것에만 초점을 두고 학습해오신 분들
  - 'Next.js', 'TanStack Query', 'TypeScript' 등 추가적인 학습을 위한 사전 학습이 필요한 경우

 2. Anti Pattern
  - 당장 동작하는 것에는 문제가 없는 코드들을 다시 돌아봅니다.
  - 잠재적인 실수를 유발할 수 있는 코드들에 대해 케이스 위주로 파악합니다.
  - 문제가 될 것이라고 생각하지 못했던 코드들을 주의할 수 있도록 깨우칩니다.

 3. Best Practice
  - 더 좋은 코드는 무엇인지 모범 사례들을 나열해봅니다.
  - 정답을 찾기보다는 더 나은 것들을 찾고 단계 별로 접근하여 수정합니다.

 4. Cookbook
  - A to Z, 1페이지부터 완독, 1강부터 완강까지 보는 학습법을 타파합니다.
  - 필요에 따라 원하는 부분만 참고할 수 있는 요리책 혹은 유틸리티 라이브러리처럼 가볍게 접근하고 시작합니다.

 5. 좋은 코드 작성을 위한 의식적인 수련
  - 의식적인 수련을 유도하여 좋은 습관으로 개선합니다.
  - 코드 리뷰 교육 플랫폼 NEXTSTEP에 참여하시면 배운 내용을 실제로 적용하며 피드백을 받을 수 있습니다.`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 리액트를 잘 활용하기 위해 클린 코드의 중요성을 이해해야 합니다. 클린 코드는 유지보수성과 협업을 용이하게 하며, 실수를 방지하는 데 도움을 줍니다. 특히, 리액트에서 클린 코드는 컴포넌트의 재사용성과 상태 관리의 효율성을 높이는 데 중요한 역할을 합니다. 안티패턴은 코드가 동작은 하지만 유지보수와 확장성에서 문제가 될 수 있는 구조를 의미합니다. 예를 들어, 상태 관리가 복잡하거나 컴포넌트가 지나치게 많은 책임을 가지는 경우가 이에 해당합니다. 반면, 모범 사례는 코드의 품질을 높이고 효율적으로 동작하며, 팀원들이 쉽게 이해할 수 있는 구조를 제공합니다. 예를 들어, 컴포넌트를 작은 단위로 나누고, 상태를 명확히 정의하며, 재사용 가능한 코드를 작성하는 것이 모범 사례에 해당합니다.`,
          },
        },
        {
          title: "요즘 리액트",
          content: {
            basic: ` 0. 2016년쯤 국내에 리액트가 전파되기 시작한 것을 기점으로 리액트에 많은 변화가 발생
   때문에 학습 전 요즘 리액트가 어떤지 파악할 필요가 있음

 1. React & TypeScript 조합은 기본
  - 'React' & 'TypeScript' 타입 궁합이 점점 더 성숙해지고 있음
  - 기본적으로 모든 라이브러리들은 'TypeScript' 기반으로 되어있는 경우가 대부분
  - 떠오르는 'Rust' ⇒ 'WASM' 조합이 있지만 주로 대중화는 아직..
  - 'TypeScript' 반대 여론도 생겨나는 중 (ex: 'Svelte', 'Turbo')

 2. Next.js + Vercel
  - 'Next.js'는 거의 대세 프레임워크로 자리를 굳건히 하고 있음
  - 'React' 개발팀과 교류하고 심지어 협업하는 듯한 출시까지 하고 있어 'Early React' 라는 수식어가 생김
  - 'Remix'에서 Router를 메인테이닝하며 많은 노력을 하고 있지만 아직 격차가 있음
  - [Beta 문서가 드디어 등장](https://react.dev/) 레거시에서 교체되어가는 중
  - 상당히 편리하고 친절하여 학습하는데 많은 도움이 됨
  - 번역 도구의 발전과 국내 개발자들의 실시간 번역으로 학습에 병목이 없음

 3. 상태 관리 패러다임의 변화
  - 'Redux' 천하에 'MobX'의 견제정도였던 시장에 큰 파란이 생김
  - 'Context API' & 'Hooks' 조합으로 더욱 성숙해진 생태계
  - 야심차게 등장한 'Recoil', 'Redux Toolkit'도 힘을 쓰지 못하는 중
  - [Poimandres](https://github.com/pmndrs) 에서 만든 Recoil like 'Jotai', Redux like 'Zustand' 상승세
  - 'TanStack Query'의 편의성으로 모든 상태 관리가 희미해짐

 4. React Server Component
  - 드디어 서버 사이드 컴포넌트의 등장
  - 'Next.js' v14 을 통해 사용자들이 테스트 하는 중

 5. 핵심 개발자 이탈
  - 'Meta' 대규모 해고 대란으로 내부 개발팀이 어수선해진 상황
  - 'Dan Abramov' 등 많은 [핵심 개발자들 이탈]
  - 'CRA', 'React', 'RN' 등 업데이트가 속도가 점점 지연되는 중
  - 심지어 'Recoil' 은 독립 프로젝트로 운영될 예정`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 리액트는 TypeScript와 Next.js와 같은 최신 기술과 결합하여 더욱 강력한 생태계를 형성하고 있습니다. 이를 통해 개발자는 더 나은 사용자 경험을 제공할 수 있습니다. 특히, 상태 관리와 서버 사이드 렌더링이 발전하면서 개발 효율성이 크게 향상되었습니다. 과거의 방식인 Redux를 무조건 사용하는 것은 요즘 리액트의 흐름과 맞지 않을 수 있습니다. 최신 상태 관리 라이브러리를 활용하는 것이 더 효율적입니다. 예를 들어, Context API와 Hooks를 활용하면 더 간결한 상태 관리를 구현할 수 있습니다. 최신 상태 관리 라이브러리인 Jotai와 Zustand를 활용하면 더 간결하고 효율적인 상태 관리를 구현할 수 있습니다. 또한, Next.js와 같은 프레임워크를 사용하면 서버 사이드 렌더링과 클라이언트 사이드 렌더링을 쉽게 구현할 수 있습니다.`,
          },
        },
        {
          title: "개발 환경",
          content: {
            basic: ` 1. 강의에 사용될 실습 환경
  O React v18
  O Vite
  O Visual Studio Code
  X TypeScript
  X Next.js

 2. Vite 개발 환경
  - bash
    # npm 7+, '--'를 반드시 붙여주세요
    npm create vite@latest clean-code-react-app -- --template react
  - # yarn
    yarn create vite clean-code-react-app --template react
  - # pnpm
    pnpm create vite clean-code-react-app --template react

 3. Web Code Space`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 리액트 개발 환경을 설정할 때 Vite와 같은 최신 도구를 사용하는 것이 좋습니다. 이는 빠른 빌드 속도와 간편한 설정을 제공합니다. Visual Studio Code와 같은 IDE를 활용하면 생산성을 더욱 높일 수 있습니다. 복잡한 설정이나 불필요한 도구를 사용하는 것은 초보자에게 혼란을 줄 수 있습니다. 예를 들어, TypeScript를 사용하지 않으면서도 관련 설정을 추가하는 것은 불필요한 작업이 될 수 있습니다. 간단하고 직관적인 설정을 통해 개발 환경을 구성하면 학습 곡선을 줄이고 생산성을 높일 수 있습니다. 예를 들어, Vite를 사용하여 프로젝트를 초기화하고, 필요한 라이브러리만 설치하여 개발을 시작하는 것이 좋은 접근 방식입니다.`,
          },
        },
        {
          title: "주의사항",
          content: {
            basic: ` 1. 클린코드는 무적이 아니다.
  - 클린코드가 무조건 최고는 아닙니다.
  - 무조건 클린코드 === 좋은 코드는 아닙니다.
  - 클린코드를 지켰다며 TDD를 통과했다며 기뻐하지만 React 앱이 동작하지 않음
  - 성급한 기술 도입으로 과도한 추상화 팀원들에게 피해를 줌

 2. 클린코드보다 중요한 것은 상당히 많다.
  - 작성한 코드의 확장성
  - React 앱의 완성도
  - 앱의 완성도가 떨어지는 경우 사소한 동작에도 잦은 버그가 발생
  - 함께 개발하는 팀원들과의 코드를 두고 할 수 있는 소통

 3. 강사와 강의 그리고 샘플 코드도 정답은 아니다.
  - 유명한 강사나 강의의 샘플코드 그리고 결정사항만 따라하고 동작하는 코드에 대한 이해도가 없음.
  - 오로지 맹목적인 정답이나 좋아보이는 지향점만 파고들기 위한 노력
  - 그때는 맞지만 지금은 틀릴 수 있는 혹은 다를 수 있는 것들이 다수 존재

 4. 정답보다는 맥락에 대한 이해
  - 강의에 대한 맥락과 배경을 이해하고 그동안 했던 코드 작성과 비교하여 깨우침
  - 클론 코딩이나 마구잡이로 작성했던 코드와 비교하며 이전에 봤던 코드에 대한 이해도를 높임
  - 대충 알고 있던 것들에 대해 한 걸음, 한걸음 가깝게 다가갈 수 있음`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 클린 코드는 중요하지만, 항상 최우선은 아닙니다. 앱의 완성도와 팀원 간의 협업이 더 중요할 수 있습니다. 클린 코드를 지키면서도 실용성을 고려해야 합니다. 클린 코드만을 고집하면 실제 앱이 제대로 동작하지 않을 수 있습니다. 기술 도입은 신중해야 하며, 팀원들이 이해하기 어려운 복잡한 구조를 피해야 합니다. 클린 코드를 지키면서도 앱의 완성도와 팀원 간의 소통을 고려하는 것이 중요합니다. 예를 들어, 코드 리뷰를 통해 팀원들과 협업하고, 필요한 경우 간단한 코드로 문제를 해결하는 것이 좋은 접근 방식입니다.`,
          },
        },
      ],
    },
    {
      id: 2,
      title: "State",
      items: [
        {
          title: "올바른 초기값 설정",
          content: {
            basic: ` 1. 초기값?
  - 가장 먼저 렌더링될때 순간적으로 보여질 수 있는 값이기도 하다.
  - 당연히 초기에 렌더링 되는 값
  - 초기값 지키지 않을 경우?
  - 렌더링 이슈, 무한 루프, 타입 불일치로 의도치 않는 동작 => 런타임 에러 넣지 않으면? undefined
  - 상태를 CRUD => 상태를 지울때도 초기값을 잘 기억해놔야 원상태로 돌아간다.
  - 빈값? null 처리를 할때 불필요한 방어코드도 줄여준다!`, 
            badExample: `function InitState() {
  const [count, setCount] = useState();
  const [list, setList] = useState();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const response = await fetch("https://api.example.com/data");
      const result = await response.json();
      setList(result);
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>

      {list.map((item) => (
        <Item item={item} />
      ))}
    </>
  );
}`, 
            goodExample: `function InitState() {
  const [count, setCount] = useState('0');
  const [list, setList] = useState();

  const resetState = () => {
    setCount(INIT_COUNT_STATE)
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const response = await fetch("https://api.example.com/data");
      const result = await response.json();
      setList(result);
    };

    fetchData();
  }, []);

  return (
    <>
      <p>Count: {count}</p>
      {/* Event Value (String => Number) */}
      <button onClick={() => setCount(count + 1)}>Increment</button>

      {list.map((item) => (
        <Item item={item} />
      ))}
    </>
  );
}`, 
            additionalExplanation: `추가설명: 상태의 초기값은 컴포넌트가 처음 렌더링될 때 중요한 역할을 합니다. 초기값을 설정하지 않으면 undefined 상태가 발생할 수 있으며, 이는 런타임 에러를 유발할 수 있습니다. 예를 들어, badExample에서는 초기값이 설정되지 않아 렌더링 이슈가 발생할 가능성이 있습니다. 반면, goodExample에서는 초기값을 명확히 설정하여 안정적인 컴포넌트를 만들고, 상태를 초기화하는 함수도 제공하여 상태 관리가 용이합니다.`,
          },
        },
        {
          title: "업데이트되지 않는 값",
          content: {
            basic: ``, 
            badExample: `function NotUpdateValue() {
	/**
	 * 컴포넌트 내부에 방치
	 */
	const INFO = {
		name: 'My Component',
		value: 'Clean Code React',
	};
	const [count, setCount] = useState(0);

	const onIncrement = () => setCount((prevCount) => prevCount);
	const onDecrement = () => setCount((prevCount) => prevCount);

	return (
		<div className="App">
			<main className="App-main">
				<header>{INFO}</header>
				<ShowCount info={INFO} count={count} />
				<ButtonGroup onDecrement={onDecrement} onIncrement={onIncrement} />
			</main>
		</div>
	);
}`, 
            goodExample: `/**
 * 컴포넌트 외부로 옮기기
 */
const INFO = {
	name: 'My Component',
	value: 'Clean Code React',
};

function NotUpdateValue() {
	const [count, setCount] = useState(0);

	const onIncrement = () => setCount((prevCount) => prevCount);
	const onDecrement = () => setCount((prevCount) => prevCount);

	return (
		<div className="App">
			<main className="App-main">
				<header>{INFO}</header>
				<ShowCount info={INFO} count={count} />
				<ButtonGroup onDecrement={onDecrement} onIncrement={onIncrement} />
			</main>
		</div>
	);
}`, 
            additionalExplanation: `추가설명: 컴포넌트 내부에 고정된 값을 두는 것은 유지보수성을 떨어뜨릴 수 있습니다. badExample에서는 고정된 값이 컴포넌트 내부에 선언되어 있어 재사용성과 확장성이 떨어집니다. 반면, goodExample에서는 고정된 값을 컴포넌트 외부로 옮겨 코드의 가독성과 유지보수성을 향상시켰습니다.`,
          },
        },
        {
          title: "플래그 상태",
          content: {
            basic: `프로그래밍에서 주로 특정 조건 혹은 제어를 위한 조건을 불리언으로 나타내는 값`, 
            badExample: `function FlagState() {
	// ❌
	const [isLogin, setIsLogin] = useState(false);

	useEffect(() => {
		if (hasToken) {
			setIsLogin(true);
		}

		if (hasCookie) {
			setIsLogin(true);
		}

		if (isValidCookie) {
			setIsLogin(true);
		}

		if (isNewUser === false) {
			setIsLogin(true);
		}

		if (isValidToken) {
			setIsLogin(true);
		}
	}, [hasToken, hasCookie, isValidCookie, isNewUser, isValidToken]);

	return <div>{isLogin && '안녕하세요! 반갑습니다'}</div>;
}`, 
            goodExample: `function FlagState() {
	// ✅
	const isLogin =
		hasToken ||
		hasCookie ||
		isValidCookie ||
		isNewUser === false ||
		isValidToken;

	return <div>{isLogin && '안녕하세요! 반갑습니다'}</div>;
}`, 
            additionalExplanation: `추가설명: 플래그 상태는 특정 조건을 나타내는 불리언 값으로, 코드의 가독성을 높이는 데 도움을 줍니다. badExample에서는 여러 조건을 개별적으로 처리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 조건을 하나의 불리언 값으로 통합하여 코드가 간결해지고 가독성이 향상되었습니다.`,
          },
        },
        {
          title: "불필요한 상태",
          content: {
            basic: ` - 불필요한 상태를 만든다면?
 - 결국에는 리액트에 의해 관리되는 값이 늘어나는 것
 -그러다보면 렌더링에 영향을 주는 값이 늘어나서 관리 포인트가 더더욱 늘어난다
 - 컴포넌트 내부에서의 변수는?
 - 렌더링 시점에 고정된 상태 값`, 
            badExample: `const MOCK_DATA = [
	{
		userId: 1,
		id: 1,
		title: 'clean code',
		completed: false,
	},
	{
		userId: 2,
		id: 2,
		title: 'clean room',
		completed: true,
	},
];

function UnnecessaryState(props) {
	const [info, setInfo] = useState({
		name: 'My Component',
		value: 'Clean Code React',
	});
	const [userList, setUserList] = useState(MOCK_DATA);
	const [propsUserList, setPropsUserList] = useState(props.userList);
	const [complUserList, setComplUserList] = useState(MOCK_DATA);

	useEffect(() => {
		const newList = complUserList.filter((user) => user.completed === true);

		setUserList(newList);
	}, [userList]);

	return (
		<div className="App">
			<header>{CONSTANTS.value}</header>
			<article>
				<ul>
					{MOCK_DATA.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>

				<ul>
					{props.userList.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>

				<ul>
					{complUserList.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>
			</article>
		</div>
	);
}`, 
            goodExample: `const MOCK_DATA = [
	{
		userId: 1,
		id: 1,
		title: 'clean code',
		completed: false,
	},
	{
		userId: 2,
		id: 2,
		title: 'clean room',
		completed: true,
	},
];

const CONSTANTS = {
	name: 'My Component',
	value: 'Clean Code React',
};

function UnnecessaryState(props) {
	const complUserList = complUserList.filter((user) => user.completed === true);

	return (
		<div className="App">
			<header>{CONSTANTS.value}</header>
			<article>
				<ul>
					{MOCK_DATA.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>

				<ul>
					{props.userList.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>

				<ul>
					{complUserList.map((user) => (
						<li>
							{user.title} / {user.completed}
						</li>
					))}
				</ul>
			</article>
		</div>
	);
}`, 
            additionalExplanation: `추가설명: 불필요한 상태를 줄이면 컴포넌트의 렌더링 성능을 개선할 수 있습니다. badExample에서는 불필요한 상태를 많이 만들어 관리 포인트가 늘어나고 렌더링 성능이 저하됩니다. 반면, goodExample에서는 필요한 상태만 관리하고 나머지는 변수로 처리하여 코드가 간결해지고 성능이 향상되었습니다.`,
          },
        },
        {
          title: "useState 대신 useRef",
          content: {
            basic: ` - 리렌더링 방지가 필요하다면 useState 대신 useRef
 - 컴포넌트의 전체적인 수명과 동일하게 지속된 정보를 일관적으로 제공해야하는 경우`, 
            badExample: `function RefInsteadOfState() {
	// ❌
	const [isMount, setIsMount] = useState(false);

	useEffect(() => {
		if (!isMount) {
			setIsMount(true);
		}
	}, [isMount]);

	return <div>{isMount && '컴포넌트 마운트 완료!'}</div>;
}`, 
            goodExample: `function RefInsteadOfState() {
	const isMount = useRef(false);

	useEffect(() => {
		isMount.current = true;

		return () => {
			isMount.current = false
		}
	}, []);

	return <div>{isMount && '컴포넌트 마운트 완료!'}</div>;
}`, 
            additionalExplanation: `추가설명: 리렌더링 방지가 필요할 때는 useState 대신 useRef를 사용하는 것이 좋습니다. badExample에서는 상태를 useState로 관리하여 불필요한 리렌더링이 발생할 수 있습니다. 반면, goodExample에서는 useRef를 사용하여 컴포넌트의 수명 동안 지속되는 정보를 일관적으로 제공하고 리렌더링을 방지합니다.`,
          },
        },
        {
          title: "연관된 상태 단순화하기",
          content: {
            basic: ``, 
            badExample: `function FlatState() {
	const [isLoading, setIsLoading] = useState(false);
	const [isFinish, setIsFinish] = useState(false);
	const [isError, setIsError] = useState(false);

	const fetchData = () => {
    // fetch Data 시도
		setIsLoading(true);

		fetch(url)
			.then(() => {
        // fetch Data 성공
				setIsLoading(false);
				setIsFinish(true);
			})
			.catch(() => {
        // fetch Data 실패
				setIsError(true);
			});
	};

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent />;
	if (isFinish) return <SuccessComponent />;
}`, 
            goodExample: `const PROMISE_STATE = {
  INIT: 'init',
  LOADING: 'loading',
  FINISH: 'finish',
  ERROR: 'error',
}

function FlatState() {
	const [promiseState, setPromiseState] = useState(PROMISE_STATE.INIT);

	const fetchData = () => {
    // fetch Data 시도
		setPromiseState(PROMISE_STATE.LOADING);
    
		fetch(url)
      .then(() => {
      // fetch Data 성공
        setPromiseState(PROMISE_STATE.FINISH);
			})
			.catch(() => {
        // fetch Data 실패
        setPromiseState(PROMISE_STATE.ERROR);
			});
	};

	if (promiseState === PROMISE_STATE.LOADING) return <LoadingComponent />;
	if (promiseState === PROMISE_STATE.ERROR) return <ErrorComponent />;
	if (promiseState === PROMISE_STATE.FINISH) return <SuccessComponent />;
}`, 
            additionalExplanation: `추가설명: 연관된 상태를 단순화하면 코드의 가독성과 유지보수성을 높일 수 있습니다. badExample에서는 여러 상태를 개별적으로 관리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 상태를 하나의 값으로 통합하여 코드가 간결해지고 관리가 용이해졌습니다.`,
          },
        },
        {
          title: "연관된 상태는 객체로 묶어내기",
          content: {
            basic: ``, 
            badExample: `function ObjectState() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFail, setIsFail] = useState(false);

	const fetchData = () => {
    // fetch Data 시도
		setIsLoading(true);

		fetch(url)
			.then(() => {
        // fetch Data 성공
				setIsLoading(false);
				setIsSuccess(true);
			})
			.catch(() => {
        // fetch Data 실패
				setIsFail(true);
			});
	};

	if (isLoading) return <LoadingComponent />;
	if (isFail) return <ErrorComponent />;
	if (isSuccess) return <SuccessComponent />;
}`, 
            goodExample: `function ObjectState() {
	const [fetchState, setFetchState] = useState({
    isLoading: false,
    isFinish: false,
    isError: false,
  });

	const fetchData = () => {
    // fetch Data 시도
		setFetchState((prevState) => ({
      ...prevState,
      isLoading: true,
    }));

		fetch(url)
			.then(() => {
        // fetch Data 성공
        setFetchState((prevState) => ({
          ...prevState,
          isFinish: true,
        }));
			})
			.catch(() => {
        // fetch Data 실패
        setFetchState((prevState) => ({
          ...prevState,
          isError: true,
        }));
			});
	};

	if (fetchState.isLoading) return <LoadingComponent />;
	if (fetchState.isError) return <ErrorComponent />;
	if (fetchState.isFinish) return <SuccessComponent />;
}`, 
            additionalExplanation: `추가설명: 연관된 상태를 객체로 묶으면 코드의 가독성과 유지보수성이 향상됩니다. badExample에서는 상태를 개별적으로 관리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 상태를 객체로 묶어 관리하여 코드가 간결해지고 관리가 용이해졌습니다.`,
          },
        },
        {
          title: "useState에서 useReducer로 리팩터링",
          content: {
            basic: ``, 
            badExample: `/**
 * 구조화 된 상태를 원한다면 useReducer()
 */
function StateToReducer() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [isFail, setIsFail] = useState(false);

	const fetchData = () => {
    // fetch Data 시도
		setIsLoading(true);

		fetch(url)
			.then(() => {
        // fetch Data 성공
				setIsLoading(false);
				setIsSuccess(true);
			})
			.catch(() => {
        // fetch Data 실패
				setIsFail(true);
			});
	};

	if (isLoading) return <LoadingComponent />;
	if (isFail) return <ErrorComponent />;
	if (isSuccess) return <SuccessComponent />;
}`, 
            goodExample: `/**
 * 구조화 된 상태를 원한다면 useReducer()
 */
const INIT_STATE = {
  isLoading: false,
  isSuccess: false,
  isFail: false,
};

const ACTION_TYPE = {
  FETCH_LOADING: "FETCH_LOADING",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_FAIL: "FETCH_FAIL",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_LOADING":
      return { isLoading: true, isSuccess: false, isFail: false };

    case "FETCH_SUCCESS":
      return { isLoading: false, isSuccess: true, isFail: false };

    case "FETCH_FAIL":
      return { isLoading: false, isSuccess: false, isFail: true };

    default:
      return INIT_STATE;
  }
};

function StateToReducer() {
  const [state, dispatch] = useReducer(reducer, INIT_STATE);

  const fetchData = () => {
    // fetch Data 시도
    dispatch({ type: ACTION_TYPE.FETCH_LOADING });

    fetch(url)
      .then(() => {
        // fetch Data 성공
        dispatch({ type: ACTION_TYPE.FETCH_SUCCESS });
      })
      .catch(() => {
        // fetch Data 실패
        dispatch({ type: ACTION_TYPE.FETCH_FAIL });
      });
  };

  if (state.isLoading) return <LoadingComponent />;
  if (state.isFail) return <ErrorComponent />;
  if (state.isSuccess) return <SuccessComponent />;
}`, 
            additionalExplanation: `추가설명: 복잡한 상태 로직을 관리할 때는 useReducer를 사용하는 것이 좋습니다. badExample에서는 여러 상태를 개별적으로 관리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 useReducer를 사용하여 상태 관리 로직을 구조화하고 가독성을 높였습니다.`,
          },
        },
        {
          title: "상태 로직 Custom Hooks으로 뽑아내기",
          content: {
            basic: ``, 
            badExample: `const INIT_STATE = {
  isLoading: false,
  isSuccess: false,
  isFail: false,
};

const ACTION_TYPE = {
  FETCH_LOADING: "FETCH_LOADING",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_FAIL: "FETCH_FAIL",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_LOADING":
      return { isLoading: true, isSuccess: false, isFail: false };

    case "FETCH_SUCCESS":
      return { isLoading: false, isSuccess: true, isFail: false };

    case "FETCH_FAIL":
      return { isLoading: false, isSuccess: false, isFail: true };

    default:
      return INIT_STATE;
  }
};

function CustomHooks() {
  const [state, dispatch] = useReducer(reducer, INIT_STATE);

  const fetchData = () => {
    // fetch Data 시도
    dispatch({ type: ACTION_TYPE.FETCH_LOADING });

    fetch(url)
      .then(() => {
        // fetch Data 성공
        dispatch({ type: ACTION_TYPE.FETCH_SUCCESS });
      })
      .catch(() => {
        // fetch Data 실패
        dispatch({ type: ACTION_TYPE.FETCH_FAIL });
      });
  };

  if (state.isLoading) return <LoadingComponent />;
  if (state.isFail) return <ErrorComponent />;
  if (state.isSuccess) return <SuccessComponent />;
}`, 
            goodExample: `const INIT_STATE = {
  isLoading: false,
  isSuccess: false,
  isFail: false,
};

const ACTION_TYPE = {
  FETCH_LOADING: "FETCH_LOADING",
  FETCH_SUCCESS: "FETCH_SUCCESS",
  FETCH_FAIL: "FETCH_FAIL",
};

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_LOADING":
      return { isLoading: true, isSuccess: false, isFail: false };

    case "FETCH_SUCCESS":
      return { isLoading: false, isSuccess: true, isFail: false };

    case "FETCH_FAIL":
      return { isLoading: false, isSuccess: false, isFail: true };

    default:
      return INIT_STATE;
  }
};

const useFetchData = (url) => {
  const [state, dispatch] = useReducer(reducer, INIT_STATE);

  useEffect(() => {
    const fetchData = async () => {
      // fetch Data 시도
      dispatch({ type: ACTION_TYPE.FETCH_LOADING });
  
      await fetch(url)
        .then(() => {
          // fetch Data 성공
          dispatch({ type: ACTION_TYPE.FETCH_SUCCESS });
        })
        .catch(() => {
          // fetch Data 실패
          dispatch({ type: ACTION_TYPE.FETCH_FAIL });
        });
    };

    fetchData()
  }, [url])

  return state
}

function CustomHooks() {
  const { isLoading, isFail, isSuccess } = useFetchData('url')

  if (isLoading) return <LoadingComponent />;
  if (isFail) return <ErrorComponent />;
  if (isSuccess) return <SuccessComponent />;
}`, 
            additionalExplanation: `추가설명: 상태 로직을 Custom Hooks으로 분리하면 코드의 재사용성과 가독성이 향상됩니다. badExample에서는 상태 로직이 컴포넌트 내부에 있어 재사용성이 떨어집니다. 반면, goodExample에서는 Custom Hooks으로 상태 로직을 분리하여 코드의 재사용성과 유지보수성을 높였습니다.`,
          },
        },
        {
          title: "이전 상태 활용하기",
          content: {
            basic: ``, 
            badExample: `function PrevState() {
  const [age, setAge] = useState(42);

  function updateState() {
    setAge(age + 1); // setAge(42 + 1)
    setAge(age + 1); // setAge(42 + 1)
    setAge(age + 1); // setAge(42 + 1)
  }

  function updaterFunction() {
    setAge((prevAge) => prevAge + 1); // setAge(42 => 43)
    setAge((prevAge) => prevAge + 1); // setAge(43 => 44)
    setAge((prevAge) => prevAge + 1); // setAge(44 => 45)
  }
}`, 
            goodExample: `function PrevState() {
  const { cardState, setCardState } = useCard({
    cardCompany: "",
    cardNumber: "",
    cardHolder: "",
    expiredDate: "",
  });

  const handleCardNumber = (cardNumber) => {
    setCardState((prevState) => ({
      ...prevState,
      cardNumber,
    }));

    if (cardNumber.length === 8) {
      setOpenCardPopup(true);
    }
  };

  const handleCardCompany = (cardCompany) => {
    setCardState((prevState) => ({
      ...prevState,
      ...cardCompany,
    }));

    setOpenCardPopup(false);
  };

  return (
    <div>
      <input
        type="number"
        value={cardState.cardNumber}
        onChange={(e) => handleCardNumber(e.target.value)}
      />
      <input
        type="text"
        value={cardState.cardCompany}
        onChange={(e) => handleCardCompany(e.target.value)}
      />
    </div>
  );
}`, 
            additionalExplanation: `추가설명: 이전 상태를 활용하면 상태 업데이트 로직을 간결하게 작성할 수 있습니다. badExample에서는 이전 상태를 활용하지 않아 상태 업데이트가 비효율적으로 이루어집니다. 반면, goodExample에서는 이전 상태를 활용하여 상태 업데이트 로직을 간결하고 효율적으로 작성했습니다.`,
          },
        },
      ],
    },
    {
      id: 3,
      title: "Props",
      items: [
        {
          title: "Curly Braces",
          content: {
            basic: ``, 
            badExample: `function CurlyBraces() {
	return (
		<header
			className={'clean-header'}
			id={'clean-code'}
			style={{
				backgroundColor: 'blue',
				width: 1000,
			}}
			title={'Clean Code React'}
		>
			<img
				className={'profile'}
				src={'fake-path/fake-file.jpg'}
				alt={'profile-image'}
			/>
		</header>
	);
}`, 
            goodExample: `function CurlyBraces() {
	const styles = {
		backgroundColor: 'blue',
		width: 1000,
	};

	return (
		<header
			className="clean-header"
			id="clean-code"
			style={styles}
			style={{
				backgroundColor: 'blue',
				width: 1000,
			}}
			value={{}}
			title="Clean Code React"
			value={1}
			value={true}
			value={[]}
			value={() => {}}
			value={1 + 2}
			value={isLogin && hasCookie}
		>
			<img
				className="profile"
				src="fake-path/fake-file.jpg"
				alt="profile-image"
			/>
		</header>
	);
}`, 
            additionalExplanation: `추가설명: JSX에서 중괄호를 사용하면 자바스크립트 표현식을 삽입할 수 있습니다. badExample에서는 모든 속성 값에 중괄호를 사용하여 불필요하게 복잡해 보입니다. 반면, goodExample에서는 필요한 경우에만 중괄호를 사용하여 코드의 가독성을 높였습니다.`,
          },
        },
        {
          title: "Shorthand Props",
          content: {
            basic: ``, 
            badExample: `function ShorthandProps(props) {
	return (
		<header
			className="clean-header"
			title="Clean Code React"
			isDarkMode={true}
			isLogin={true}
			hasPadding={true}
			isFixed={true}
			isAdmin={true}
		>
			<ChildComponent {...props} />
		</header>
	);
}`, 
            goodExample: `function ShorthandProps({ isDarkMode, isLogin, ...props }) {
	return (
		<header
			className="clean-header"
			title="Clean Code React"
			isDarkMode={isDarkMode}
			isLogin={isLogin}
			hasPadding
			isFixed
			isAdmin
		>
			<ChildComponent {...props} />
		</header>
	);
}`, 
            additionalExplanation: `추가설명: Props를 전달할 때 불필요한 값을 명시적으로 작성하지 않고, shorthand 방식으로 전달하면 코드가 간결해집니다. badExample에서는 모든 Props 값을 명시적으로 작성하여 코드가 길어지고 복잡해졌습니다. 반면, goodExample에서는 shorthand 방식으로 Props를 전달하여 코드가 간결하고 가독성이 높아졌습니다.`,
          },
        },
        {
          title: "Single Quote vs Double Quote",
          content: {
            basic: ` - 규칙에 정답은 없습니다.
 - HTML? JavaScript? 에서의 차이를 두는지?
 - 결론적으로 규칙을 정하고 그 맥락을 파악하고 공유하자
 - Lint, 포맷팅 도구(Prettier)에 위임하자
function HelloWorld() {
	const obj = {
		hello: 'world',
	};

	return (
		<>
			{/* ✅ */}
			<a href="https://www.udemy.com/course/clean-code-js">Clean Code JS</a>

			{/* ❌ */}
			<input class='ccrc' type="button" value='Clean Code React' />

			{/* ❌ */}
			<Clean style={{ backgroundPosition: "left" }} />
		</>
	);
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: JSX에서 속성 값에 사용할 따옴표는 규칙을 정하고 일관성을 유지하는 것이 중요합니다. badExample에서는 따옴표 사용이 일관되지 않아 혼란을 줄 수 있습니다. 반면, goodExample에서는 일관된 따옴표 사용으로 코드의 가독성을 높였습니다.`,
          },
        },
        {
          title: "알아두면 좋은 Props 네이밍",
          content: {
            basic: ``, 
            badExample: `function PropsNaming() {
	return (
		<>
			{/* ❌ */}
			<ChildComponent
				class="mt-0"
				Clean="code"
				clean_code="react"
				otherComponent={OtherComponent}
				isShow={true}
			/>
		</>
	);
}

function ChildComponent({ Clean, clean_code, otherComponent }) {}`, 
            goodExample: `/**
 * 알아두면 좋은 Props 네이밍
 */
function PropsNaming() {
	return (
		<>
			<ChildComponent
				className="mt-0"
				clean="code"
				cleanCode="react"
				OtherComponent={OtherComponent}
				isShow
			/>
		</>
	);
}

// function ChildComponent({ Clean, clean_code, otherComponent }) {}`, 
            additionalExplanation: `추가설명: Props의 이름은 명확하고 일관되게 작성해야 합니다. badExample에서는 Props 이름이 일관되지 않고 혼란을 줄 수 있습니다. 반면, goodExample에서는 Props 이름을 명확하고 일관되게 작성하여 코드의 가독성과 유지보수성을 높였습니다.`,
          },
        },
        {
          title: "객체 Props 지양하기",
          content: {
            basic: ` - 자바스크립트의 객체에는 배열, 함수도 포함된다.
 - 변하지 않는 값일 경우 컴포넌트 외부로 드러내기
 - 필요한 값만 객체를 분해해서 Props로 내려준다
 - 정말 값 비싼 연산, 너무 잦은 연산이 있을 경우 useMemo() 활용하여 계산된 값을 메모이제이션한다.
 - 컴포넌트를 더 평탄하게 나누면 나눌수록 Props 또한 평탄하게 나눠서 내릴 수 있다.`, 
            badExample: `function SomeComponent() {
  return (
    <ChildComponent
      propObj={{ hello: "world" }}
      propArr={["hello", "hello"]}
    />
  );
}`, 
            goodExample: `function SomeComponent({ heavyState }) {
  const [propArr, setPropArr] = useState(["hello", "hello"]);

  const computedState = useMemo(() => ({
    heavyState: heavyState
  }), [heavyState])

  return (
    <>
      <ChildComponent
        hello='world'
        hello2={propArr.at(0)}
        computedState={{
          heavyState: heavyState
        }}
        computedState2={{
          heavyState: heavyState
        }}
        />
      <ChildComponent2
        hello={propArr.at(1)}
      />
    </>
  );
}`, 
            additionalExplanation: `추가설명: 객체 형태의 Props를 전달하면 컴포넌트가 불필요하게 복잡해질 수 있습니다. badExample에서는 객체 형태로 Props를 전달하여 컴포넌트 내부에서 추가적인 분해 작업이 필요합니다. 반면, goodExample에서는 필요한 값만 분리하여 Props로 전달하여 코드가 간결하고 유지보수성이 향상되었습니다.`,
          },
        },
        {
          title: "인라인 스타일 주의하기",
          content: {
            basic: ``, 
            badExample: `function InlineStyle() {
	return (
		<button style="background-color: 'red'; font-size: '14px';">
			Clean Code
		</button>
	);
}`, 
            goodExample: `const MyButtonStyle = {
	warning: { backgroundColor: 'yellow', fontSize: '14px' },
	danger: { backgroundColor: 'red', fontSize: '24px' },
};

function InlineStyle() {
	return (
		<>
			<button style={MyButtonStyle.warning}>Warning Code Click!</button>
			<button style={MyButtonStyle.danger}>Danger Code Click!</button>
		</>
	);
}`, 
            additionalExplanation: `추가설명: 인라인 스타일을 사용하면 코드가 복잡해지고 재사용성이 떨어질 수 있습니다. badExample에서는 인라인 스타일을 직접 작성하여 코드가 복잡해졌습니다. 반면, goodExample에서는 스타일 객체를 분리하여 코드의 가독성과 재사용성을 높였습니다.`,
          },
        },
        {
          title: "CSS in JS 인라인 스타일 지양하기",
          content: {
            basic: ` - Props로 내려보내는 객체 형태는 성능에 민감한 문제를 일으킬 수 있다
 - 인라인 스타일을 지양한다면?
 - 이제 스타일 렌더링 될때마다 직렬화되지 않는다 => 한번만 된다.
 - 동적인 스타일을 실수로 건드는 확률이 적어진다.
 - 스타일 관련 코드를 분리해서 로직에 집중하고 JSX를 볼때 조금 더 간결하게 볼 수 있다.`, 
            badExample: `import { css } from '@emotion/react';

export function Card({ title, children }) {
  return (
    <div
      css={css'
        background-color: white;
        border: 1px solid #eee;
        border-radius: 0.5rem;
        padding: 1rem;
      '}
    >
      <h5
        css={css'
          font-size: 1.25rem;
        '}
      >
        {title}
      </h5>
      {children}
    </div>
  );
}`, 
            goodExample: `import { css } from '@emotion/react';

/**
 * - 타입 안정성
 * 자동 완성으로 생산성 DX
 * export, 내부에서만 사용할 수 도 있을때?
 * export하는 경우 외부의 컴포넌트에서도 사용할 수 있다.
 */
const cardCss = {
  self: css({
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '0.5rem',
    padding: '1rem',
  }),
  title: css({
    fontSize: '1.25rem',
  })
}

/**
 * CSS in JS 인라인 스타일 지양하기
 */
export function Card({ title, children }) {
  return (
    <div css={cardCss.self}>
      <h5 css={cardCss.title}>
        {title}
      </h5>
      {children}
    </div>
  );
}`, 
            additionalExplanation: `추가설명: CSS-in-JS를 사용할 때 스타일을 분리하면 코드의 가독성과 유지보수성이 향상됩니다. badExample에서는 스타일을 인라인으로 작성하여 코드가 복잡해졌습니다. 반면, goodExample에서는 스타일을 별도의 객체로 분리하여 코드가 간결하고 유지보수성이 높아졌습니다.`,
          },
        },
        {
          title: "많은 Props 일단 분리하기",
          content: {
            basic: ` - 너무 많은 Props를 넘기는 경우 대부분 렌더링에 분리하고 확장성이 떨어진다.
 - 과도환 최적화는 금물 하지만 과도한 Props는 일단 분리의 대상을 찾아보자
 - TanStack Query, Form Library, 상태 관리자, Context API, Composition`, 
            badExample: `const App = () => {
  return (
    <JoinForm
      user={user}
      auth={auth}
      location={location}
      favorite={favorite}
      handleSubmit={handleSubmit}
      handleReset={handleReset}
      handleCancel={handleCancel}
    />
  );
};`, 
            goodExample: `const App = () => {
  // Step1. One Depth 분리를 한다.
  // Step2. 확장성을 위한 분리를 위해 도메인 로직을 다른 곳으로 모아넣는다.

  return (
    <JoinForm
      onSubmit={handleSubmit}
      onReset={handleReset}
      onCancel={handleCancel}
    >
      <CheckBoxForm formData={user}/>
      <CheckBoxForm formData={auth} />
      <RadioButtonForm formData={location} />
      <SectionForm formData={favorite} />
    </JoinForm>
  );
};`, 
            additionalExplanation: `추가설명: Props가 많아질 경우 컴포넌트를 분리하여 관리하면 코드의 가독성과 유지보수성이 향상됩니다. badExample에서는 많은 Props를 한 컴포넌트에 전달하여 코드가 복잡해졌습니다. 반면, goodExample에서는 Props를 분리하여 관리하여 코드가 간결하고 유지보수성이 높아졌습니다.`,
          },
        },
        {
          title: "객체보다는 단순한 Props",
          content: {
            basic: ` - 작은 컴포넌트일수록 객체를 내려받을 이유가 없다.
 - 최대한 객체가 아닌 단순한 타입을 렌더링만 하도록 유도한다.`, 
            badExample: `const UserInfo = ({ user }) => {
  return (
    <div>
      <img src={user.avatarImgUrl} />
      <h3>{user.userName}</h3>
      <h4>{user.email}</h4>
    </div>
  );
};`, 
            goodExample: `const UserInfo = ({ avatarImgUrl, userName, email }) => {
  return (
    <div>
      <img src={avatarImgUrl} />
      <h3>{userName}</h3>
      <h4>{email}</h4>
    </div>
  );
};`, 
            additionalExplanation: `추가설명: 작은 컴포넌트에서는 객체 형태의 Props를 전달하기보다 단순한 Props를 전달하는 것이 좋습니다. badExample에서는 객체 형태로 Props를 전달하여 컴포넌트가 불필요하게 복잡해졌습니다. 반면, goodExample에서는 단순한 Props를 전달하여 코드가 간결하고 유지보수성이 향상되었습니다.`,
          },
        },
        {
          title: "...props 주의할 점",
          content: {
            basic: ``, 
            badExample: `const ParentComponent = (props) => {
  return <ChildOrHOCComponent {...props} />
}

class ParentComponent extends React.Component {
  render() {
    return <ChildOrHOCComponent {...this.props} />
  }
}`, 
            goodExample: `const ParentComponent = (props) => {
  const { 관련_없는_props, 관련_있는_props, ...나머지_props} = props;

  return (<ChildOrHOCComponent 
      관련_있는_props={관련_있는_props}
      {...나머지_props}
    />)
}

class ParentComponent extends React.Component {
  render() {
    const { 관련_없는_props, 관련_있는_props, ...나머지_props} = this.props;

    return (<ChildOrHOCComponent 
      관련_있는_props={관련_있는_props}
      {...나머지_props}
    />)
  }
}`, 
            additionalExplanation: `추가설명: ...props를 사용할 때는 필요한 Props만 전달하도록 주의해야 합니다. badExample에서는 모든 Props를 전달하여 불필요한 데이터가 포함될 수 있습니다. 반면, goodExample에서는 필요한 Props만 분리하여 전달하여 코드의 가독성과 유지보수성을 높였습니다.`,
          },
        },
      ],
    },
    {
      id: 4,
      title: "Components",
      items: [
        {
          title: "컴포넌트 내부의 inner 컴포넌트 선언",
          content: {
            basic: ` - 결합도가 증가합니다.
 - 구조적으로 스코프적으로 종속된 개발이 됩니다.
 - 확장에 어려움이 있습니다.
 - 컴포넌트 리렌더로 성능 저하`, 
            badExample: `/**
 * 컴포넌트 내부에 컴포넌트 선언
 */
function OuterComponent() {

	const InnerComponent = () => {
		return <div>Inner component</div>;
	};

	return (
		<div>
			<InnerComponent />
		</div>
	);
}`, 
            goodExample: `const InnerComponent = () => {
	return <div>Inner component</div>;
};

function OuterComponent() {
	return (
		<div>
			{/* <div>Inner component</div> */}
			<InnerComponent />
		</div>
	);
}`, 
            additionalExplanation: `추가설명: 컴포넌트 내부에 inner 컴포넌트를 선언하면 결합도가 증가하고 확장성이 떨어질 수 있습니다. badExample에서는 inner 컴포넌트를 컴포넌트 내부에 선언하여 재사용성과 유지보수성이 낮아졌습니다. 반면, goodExample에서는 inner 컴포넌트를 외부로 분리하여 코드의 가독성과 재사용성을 높였습니다.`,
          },
        },
        {
          title: "컴포넌트 구성하기",
          content: {
            basic: ` - 컴포넌트 구성에 정답은 없습니다.
 - 컴포넌트 내부와 외부에 위치해야할 변수와 함수를 구분하면 좋습니다.
 - 구분해볼만한 케이스
 - 변하지 않는 정적 데이터
 - React 에 의존적인 요소들을 고려합니다.
 - 내부 변수
  Ref, useState, Custom Hooks, useEffect(), Third Party Libraries Hooks
 - 컴포넌트 내부의 요소의 순서를 케이스 별로 배치하면 좋습니다.
  const DEFAULT_COUNT = 100;
  const DEFAULT_DELAY = 500;

interface SomeComponentProps {

}

const Button = styled.a<{ $primary?: boolean; }>'
  padding: 0.5rem 0;
  transition: all 200ms ease-in-out;
  width: 11rem;

  &:hover {
    filter: brightness(0.85);
  }
'

const handleClose = () => {
  // Date
  // Local Storage
}

const SomeComponent = ({ prop1, prop2 }: SomeComponentProps) => {
  let isHold = false;

  const ref = useRef(null);

  const location = useLocation();
  const queryClient = useQueryClient();
  const state = useSelector((state) => state);

  const state = useCustomHooks((state) => state);

  const [state, setState] = useState("someState");

  const onClose = () => handleClose();

  // Early Return JSX
  if (isHold) {
    return <div>데이터가 존재하지 않습니다</div>;
  }

  // ✅ Main JSX와 가장 가까운 곳에 위치
  useEffect(() => {
  }, []);

  // ✅ JSX 반환은 항상 사전에 개행을 동반
  return (
    <div className="tooltip">
      <div className="msg">Hello World</div>
      <button
        className="close"
        type="button"
        onClick={onClose}
      />
    </div>
  );
}

export default SomeComponent;`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 컴포넌트를 구성할 때 내부와 외부에 위치해야 할 변수와 함수를 구분하면 코드의 가독성과 유지보수성이 향상됩니다. badExample에서는 이러한 구분이 명확하지 않아 코드가 복잡해질 수 있습니다. 반면, goodExample에서는 정적 데이터와 React에 의존적인 요소를 구분하여 컴포넌트를 구성하여 코드의 가독성과 유지보수성을 높였습니다.`,
          },
        },
        {
          title: "컴포넌트 네이밍",
          content: {
            basic: ` - 일반적으로 컴포넌트
  PascalCase
 - 기본 HTML 요소
  lower case 
 - Route based File name
  kebab-case.jsx
<ComponentNaming />
component-naming.jsx
component-naming/index.jsx
function ComponentNaming() {
	return (
		<>
			<h1></h1>
			<h2></h2>
			<div></div>
			<input />
			<MyComponent></MyComponent>
			<my-component></my-component>
		</>
	);
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 컴포넌트 네이밍은 일관성을 유지하는 것이 중요합니다. 일반적으로 컴포넌트는 PascalCase를 사용하고, 기본 HTML 요소는 소문자를 사용합니다. badExample에서는 네이밍 규칙이 일관되지 않아 혼란을 줄 수 있습니다. 반면, goodExample에서는 일관된 네이밍 규칙을 사용하여 코드의 가독성을 높였습니다.`,
          },
        },
        {
          title: "displayName",
          content: {
            basic: `Case 1
const InputText = forwardRef((props, ref) => {
	return <input type="text" ref={ref} />;
});

/**
 * ✅
 */
InputText.displayName = 'InputText';
​
Case 2
const withRouter = (Component) => {
	return (props) => {
		const location = useLocation();
		const navigate = useNavigate();
		const params = useParams();
		const navigationType = useNavigationType();

		return (
			<Component
				{...props}
				location={location}
				navigate={navigate}
				params={params}
				navigationType={navigationType}
			/>
		);
	};
	
	/**
   * ✅
   */
	WithRouter.displayName = Component.displayName ?? Component.name ?? 'WithRouterComponent';
};`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: displayName은 디버깅 시 컴포넌트 이름을 명확히 표시하는 데 유용합니다. badExample에서는 displayName을 설정하지 않아 디버깅이 어려울 수 있습니다. 반면, goodExample에서는 displayName을 명시적으로 설정하여 디버깅과 유지보수가 용이해졌습니다.`,
          },
        },
        {
          title: "Fragment 지양하기",
          content: {
            basic: `Case 1
function Example() {
	/**
	 * ❌
	 * 불필요한 Fragment
	 */
	return (
		<>
			<div>
				<h1>Outer Component</h1>
				<div>
					<h2>Middle Component</h2>
					<div>
						<h3>Inner Component 1</h3>
						<div>
							<h4>Deeply Nested Component 1</h4>
							<div>
								<h5>Even Deeper Component 1</h5>
								<div>
									<h6>Deepest Component 1</h6>
								</div>
							</div>
						</div>
						<div>
							<h4>Deeply Nested Component 2</h4>
							<div>
								<h5>Even Deeper Component 2</h5>
							</div>
						</div>
					</div>
					<div>
						<h3>Inner Component 2</h3>
						<div>
							<h4>Deeply Nested Component 3</h4>
							<div>
								<h5>Even Deeper Component 3</h5>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
​
Case 2
function StringRender() {
	/**
	 * ❌
	 * 불필요한 Fragment
	 */
	return <>Clean Code React</>;
}

function ArrayRender() {
	/**
	 * ❌
	 * 불필요한 Fragment
	 */
	return ['Clean', 'Code', 'React'];
}
​
Case 3
class Clock extends React.Component {
	state = {
		date: new Date(),
	};

	componentDidMount() {
		this.timeId = setInterval(() => {
			this.setState({ date: new Date() });
		}, 1000);
	}

	render() {
		/**
		 * ❌
		 * 불필요한 부모 Fragment
		 */
		return <>{this.state.toISOString()}</>;
	}

	componentWillUnmount() {
		clearInterval(this.timeId);
	}
}

function ConditionalRenderingExample({ isLoggedIn }) {
	return (
		<div>
			<h1>{isLoggedIn ? 'User' : <></>}</h1>
		</div>
	);
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: 불필요한 Fragment 사용은 코드의 복잡성을 증가시킬 수 있습니다. badExample에서는 Fragment를 과도하게 사용하여 코드가 복잡해졌습니다. 반면, goodExample에서는 필요한 경우에만 Fragment를 사용하여 코드의 가독성을 높였습니다.`,
          },
        },
        {
          title: "Fragment 지향하기",
          content: {
            basic: `Case 1
function Example() {
  /**
	 * ❌
	 * Adjacent JSX elements must be wrapped in an enclosing tag.
   * Did you want a JSX fragment <>...</>?
	 */
  return (<ChildA />
  <ChildB />
  <ChildC />)
}

// ✅
function Example() {
	return (
		<>
			<ChildA />
			<ChildB />
			<ChildC />
		</>
	);
}

​
Case 2
function ShortCutFragment({ posts }) {
	return posts.map(({ id, title, body }) => (
		/**
		 * ❌
		 * index 없음
		 *
		 * 💡
		 * 레거시의 경우 호환 버전 확인 필요
		 */
		<>
			<PostTitle title={title} />
			<PostBody body={body} />
		</>
	));
}

// ✅
function ShortCutFragment(items) {
	return (
		<React.Fragment key={id}>
			<dt>{item.term}</dt>
			<dd>{item.description}</dd>
		</React.Fragment>
	);
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: JSX에서 인접한 요소를 렌더링할 때 Fragment를 사용하면 코드가 간결해지고 가독성이 향상됩니다. badExample에서는 Fragment를 사용하지 않아 JSX 요소를 올바르게 렌더링하지 못했습니다. 반면, goodExample에서는 Fragment를 사용하여 JSX 요소를 올바르게 렌더링했습니다.`,
          },
        },
        {
          title: "JSX 컴포넌트 함수로 반환",
          content: {
            basic: ``, 
            badExample: `function ReturnJSXFunction() {
	const TopRender = () => {
		return (
			<header>
				<h1>Clean Code JavaScript</h1>
			</header>
		);
	};

	const renderMain = () => {
		return (
			<main>
				<p>Clean Code React</p>
			</main>
		);
	};

	return (
		<div>
			{TopRender()}
			{renderMain()}
		</div>
	);
}`, 
            goodExample: `function ReturnJSXFunction() {
	const TopRender = () => {
		return (
			<header>
				<h1>Clean Code JavaScript</h1>
			</header>
		);
	};

	const renderMain = () => {
		return (
			<main>
				<p>Clean Code React</p>
			</main>
		);
	};

	return (
		<div>
			{TopRender()}
			<TopRender />
			{renderMain()}
		</div>
	);
}`, 
            additionalExplanation: `추가설명: JSX를 컴포넌트 함수로 반환하면 코드의 재사용성과 가독성이 향상됩니다. badExample에서는 JSX를 함수로 반환하지 않아 코드가 복잡해졌습니다. 반면, goodExample에서는 JSX를 함수로 반환하여 코드의 재사용성과 가독성을 높였습니다.`,
          },
        },
        {
          title: "Self Closing Tags",
          content: {
            basic: ` - 명시적으로 닫는 태그가 필요 없음을 의미
 - 기본 HTML 요소인지 아닌지 명확한 차이를 가져야합니다.`, 
            badExample: `function HelloWorld() {
	return (
		<Clean>
			<Header></Header>
			<Code>
				<img />
				<br />
			</Code>
			<React></React>
			<Footer></Footer>
		</Clean>
	);
}`, 
            goodExample: `function HelloWorld() {
	return (
		<Clean>
			<Code>
				<React>
					<Header />
					<Code>
						<img />
						<br />
					</Code>
					<React />
					<footer />
				</React>
			</Code>
		</Clean>
	);
}`, 
            additionalExplanation: `추가설명: Self Closing Tags는 명시적으로 닫는 태그가 필요 없는 경우 사용하면 코드가 간결해집니다. badExample에서는 불필요하게 닫는 태그를 사용하여 코드가 복잡해졌습니다. 반면, goodExample에서는 Self Closing Tags를 사용하여 코드의 가독성을 높였습니다.`,
          },
        },
      ],
    },
    {
      id: 5,
      title: "Hooks",
      items: [
        {
          title: "useEffect() 내부의 비동기",
          content: {
            basic: ` - await is only allowed within async functions
 - 기본 HTML 요소인지 아닌지 명확한 차이를 가져야합니다.`, 
            badExample: `useEffect(async () => {
  // 비동기 작업
  const result = await fetchData();
}, []);`, 
            goodExample: `useEffect(() => {
  const fetchData = async () => {
    const result = await someFetch();
  };

  fetchData();
}, [dependency]);`, 
            additionalExplanation: `추가설명: useEffect 내부에서 비동기 작업을 수행할 때는 별도의 비동기 함수를 선언하여 호출하는 것이 좋습니다. badExample에서는 useEffect를 직접 비동기 함수로 선언하여 경고가 발생할 수 있습니다. 반면, goodExample에서는 비동기 작업을 별도의 함수로 분리하여 코드의 안정성과 가독성을 높였습니다.`,
          },
        },
        {
          title: "Custom Hooks 반환의 종류",
          content: {
            basic: ` - await is only allowed within async functions
 - 기본 HTML 요소인지 아닌지 명확한 차이를 가져야합니다.`, 
            badExample: `function ReturnCustomHooks() {
  // ❌
  const [setValue, value] = useSomeHooks(true);
  // ❌
  const [oneValue] = useSomeHooks();
  // ❌
  const [firstValue, secondValue, _, thirdValue] = useSomeHooks(true);
  // ❌
  const [firstValue, secondValue, _, thirdValue] = useSomeHooks(true);

  const query = useQuery({ queryKey: ['hello'], queryFn: getHello })

  const data = query.data;
  const refetch = query.refetch
  const isSuccess = query.isSuccess

  return (
    // ...some Logic
  )
}`, 
            goodExample: `/**
 * Custom Hooks 반환의 종류
 */
const useSomeHooks = (bool) => {
  return {
    first,
    second,
    third,
    rest,
  }
}

function ReturnCustomHooks() {
  const [setValue, value] = useSomeHooks(true);
  const oneValue = useSomeHooks();
  const { first: firstValue, second: secondValue, rest: thirdValue } = useSomeHooks(true);

  const {
    data: helloData,
    refetch: helloRefetch,
    isSuccess: helloIsSuccess
  } = useQuery({ queryKey: ['hello'], queryFn: getHello })
  const query = useQuery({ queryKey: ['hello2'], queryFn: getHello })

  const hello2Data = query.data;
  const hello2Refetch = query.refetch
  const hello2IsSuccess = query.isSuccess

  return (
    // ...some Logic
  )
}`, 
            additionalExplanation: `추가설명: Custom Hooks는 반환값을 명확히 정의하여 사용성을 높이는 것이 중요합니다. badExample에서는 반환값이 불명확하거나 구조가 복잡하여 사용하기 어렵습니다. 반면, goodExample에서는 반환값을 객체 형태로 명확히 정의하여 코드의 가독성과 재사용성을 높였습니다.`,
          },
        },
        {
          title: "useEffect() 기명 함수와 함께 사용하기",
          content: {
            basic: `useEffect(function isInViewSomeComponent() {
	if (isInView(someRef.current)) {
		// some logic
	}
}, [isInView]);

useEffect(function onPopState() {
	if (navigationType === 'POP') {
		// some logic
	}
}, [navigationType]);


useEffect(function onPushState() {
	if (navigationType === 'PUSH') {
		// some logic
	}
}, [navigationType]);

useEffect(function onInit() {
	if (!isInit) {
		return;
	}

	setIsInit(false);
}, [isInit]);

useEffect(function addEvent() {
	document.addEventListener();

	return function removeEvent() {
		document.removeEventListener();
	};
}, []);`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: useEffect 내부에서 기명 함수를 사용하면 코드의 가독성과 유지보수성이 향상됩니다. badExample에서는 익명 함수를 사용하여 코드의 의도를 파악하기 어려울 수 있습니다. 반면, goodExample에서는 기명 함수를 사용하여 코드의 의도를 명확히 하고 재사용성을 높였습니다.`,
          },
        },
        {
          title: "한 가지 역할만 수행하는 useEffect()",
          content: {
            basic: ` - 분리 방법은?
 - 기명 함수 선언문을 사용해보자
 - 'dependency Arrays' 너무 많은 관찰 대상이 들어가고 있는 게 아닌지 나눠보기`, 
            badExample: `jsx
function LoginPage({ token, newPath }) {
	useEffect(() => {
		redirect(newPath);
	
		const userInfo = setLogin(token);
    // ...로그인 로직
	
	}, [token, newPath]);
}`, 
            goodExample: `function LoginPage({ token, newPath }) {
  useEffect(() => {
    redirect(newPath);

    if (options) {
      // 부가적인 로직
    }
  }, [newPath, options])

	useEffect(() => {
    const userInfo = setLogin(token);
    // ...로그인 로직

    if (options) {
      // 부가적인 로직 <= 추가 동작해도 이상이 없고 부작용이 생길 일도 없다.
    }
	}, [token, options]);
}`, 
            additionalExplanation: `추가설명: useEffect는 한 가지 역할만 수행하도록 분리하는 것이 좋습니다. badExample에서는 여러 역할을 한 useEffect에서 처리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 역할별로 useEffect를 분리하여 코드의 가독성과 유지보수성을 높였습니다.`,
          },
        },
      ],
    },
    {
      id: 6,
      title: "Rendering",
      items: [
        {
          title: "안전하게 Raw HTML 다루기",
          content: {
            basic: `주의해야할 사항
렌더링 될 데이터
유저가 다시 한번 입력모드로 수정할 수 있는 데이터
ex) input, textarea
그럼 대안은?
HTML Sanitizer API
DOMPurify
eslint-plugin-risxss
const SERVER_DATA = '<p>some raw html</p>'

function DangerouslySetInnerHTMLExample() {
  const post = {
    // XSS(악성 스크립트 공격)
    content: '<img src="" onerror='alert("you were hacked")'>'
  };
  
  const sanitizeContent = { __html: DOMPurify.sanitize(SERVER_DATA) };
  setContentHTML(DOMPurify.sanitize(SERVER_DATA))
  
  // ❌
  return <div>{sanitizeContent}</div>;

  return <textarea>{contentHTML}</textarea>

  // ✅ 🤔
  return <div dangerouslySetInnerHTML={sanitizeContent} />;
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: useEffect는 한 가지 역할만 수행하도록 분리하는 것이 좋습니다. badExample에서는 여러 역할을 한 useEffect에서 처리하여 코드가 복잡해지고 유지보수가 어려워질 수 있습니다. 반면, goodExample에서는 역할별로 useEffect를 분리하여 코드의 가독성과 유지보수성을 높였습니다.`,
          },
        },
        {
          title: "리스트 내부에서의 Key",
          content: {
            basic: ` - Warning: Each child in a list should have a unique "key" prop.`, 
            badExample: `function KeyInList({ list }) {
	return (
		<>
			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item, index) => (
					<li key={index}>{item}</li>
				))}
			</ul>

			{/* 🤔 */}
			<ul>
				{list.map((item, index) => (
					<li key={'card-item-' + index}>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li key={new Date().toString()}>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li key={uuidv4()}>{item}</li>
				))}
			</ul>
		</>
	);
}`, 
            goodExample: `function KeyInList({ list }) {
	const handleAddItem = (value) => {
		setItems((prev) => [
			...prev,
			{
				id: crypto.randomUUID(),
				value: value,
			},
		]);
	};

	useEffect(() => {
		/**
		 * list를 만들때! 꼭 ID를 부여하자
		 * 혹은 새로운 아이템을 추가하는 함수를 만들때 그때 고유한 값을 넣어주자!
		 */
	}, [list]);

	return (
		<>
			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item, index) => (
					<li key={index}>{item}</li>
				))}
			</ul>

			{/* 🤔 */}
			<ul>
				{list.map((item, index) => (
					<li key={'card-item-' + index}>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li key={new Date().toString()}>{item}</li>
				))}
			</ul>

			{/* ❌ */}
			<ul>
				{list.map((item) => (
					<li key={uuidv4()} onClick={() => handleDelete(uuidv4())}>
						{item}
					</li>
				))}
			</ul>

			{/* ✅ */}
			<ul>
				{list.map((item) => (
					<li key={item.id} onClick={() => handleDelete(item.id)}>
						{item}
					</li>
				))}
			</ul>
		</>
	);
}`, 
            additionalExplanation: `추가설명: 리스트를 렌더링할 때 고유한 Key를 설정하면 React가 효율적으로 렌더링을 관리할 수 있습니다. badExample에서는 고유하지 않은 Key를 사용하여 렌더링 성능이 저하될 수 있습니다. 반면, goodExample에서는 고유한 ID를 사용하여 Key를 설정하여 렌더링 성능과 유지보수성을 높였습니다.`,
          },
        },
        {
          title: "JSX에서의 공백 처리",
          content: {
            basic: ``, 
            badExample: `export default function WhiteSpaceInJSX() {
	return (
		<div>
			{/* ❌ */}
			Welcome Clean Code&nbsp;
			<a href="clean-code-js">Go Clean Code</a>
		</div>
	);
}`, 
            goodExample: `export default function WhiteSpaceInJSX() {
	return (
		<div>
			{/* ✅ */}
			Welcome Clean Code <a href="clean-code-js">Go Clean Code</a>
		</div>
	);
}`, 
            additionalExplanation: `추가설명: JSX에서 공백을 처리할 때는 HTML 엔티티를 사용하는 대신 적절한 공백을 추가하는 것이 좋습니다. badExample에서는 불필요한 HTML 엔티티를 사용하여 코드가 복잡해졌습니다. 반면, goodExample에서는 공백을 간결하게 처리하여 코드의 가독성을 높였습니다.`,
          },
        },
        {
          title: "0(Zero)는 JSX에서 유효한 값",
          content: {
            basic: ``, 
            badExample: `function App() {
	const [items, setItems] = useState([]);

	return <div>{items.length && items.map((item) => <Item item={item} />)}</div>;
}`, 
            goodExample: `function App() {
	const [items, setItems] = useState([]);

	return (
		<div>
			{items.length > 0 ? items.map((item) => <Item item={item} />) : null}
		</div>
	);
}`, 
            additionalExplanation: `추가설명: JSX에서 숫자 0은 유효한 값으로 렌더링됩니다. badExample에서는 조건부 렌더링에서 0을 무시하여 의도치 않은 결과를 초래할 수 있습니다. 반면, goodExample에서는 조건부 렌더링을 명확히 작성하여 0을 올바르게 처리했습니다.`,
          },
        },
      ],
    },
    {
      id: 7,
      title: "ETC",
      items: [
        {
          title: "SPA에서의 새로고침",
          content: {
            basic: `export default function Login(props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    try {
      if (isSuccess === true) {
        setIsLoggedIn(true);
        // SPA 입장에서는 특히나 앱을 완전히 종료하고 다시 실행하는 행위
        window.location.reload()
      }
    } catch (error) {
      alert('로그인에 실패했습니다.');
    }
  };
}`, 
            badExample: ``, 
            goodExample: ``, 
            additionalExplanation: `추가설명: SPA에서 새로고침은 일반적으로 피해야 합니다. badExample에서는 새로고침을 통해 상태를 초기화하려고 하지만, 이는 SPA의 장점을 무시하고 사용자 경험을 저하시킬 수 있습니다. 반면, goodExample에서는 상태 관리와 컴포넌트 재렌더링을 통해 새로고침 없이 상태를 업데이트하여 SPA의 장점을 유지합니다.`,
          },
        },
      ],
    },
  ],
};

export default documentData;