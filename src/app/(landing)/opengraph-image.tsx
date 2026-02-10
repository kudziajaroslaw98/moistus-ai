import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Shiko - AI-Powered Mind Mapping';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					background: 'linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)',
					fontFamily: 'sans-serif',
				}}
			>
				{/* Grid overlay */}
				<div
					style={{
						position: 'absolute',
						inset: 0,
						backgroundImage:
							'linear-gradient(rgba(161,161,170,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(161,161,170,0.08) 1px, transparent 1px)',
						backgroundSize: '40px 40px',
					}}
				/>

				{/* Decorative circles */}
				<div
					style={{
						position: 'absolute',
						top: 60,
						left: 80,
						width: 100,
						height: 100,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
						opacity: 0.12,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						bottom: 60,
						right: 80,
						width: 160,
						height: 160,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
						opacity: 0.1,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						bottom: 140,
						left: 160,
						width: 60,
						height: 60,
						borderRadius: '50%',
						background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
						opacity: 0.1,
					}}
				/>

				{/* Mind map nodes visualization */}
				<div
					style={{
						display: 'flex',
						position: 'absolute',
						top: 0,
						left: 0,
						width: '100%',
						height: '100%',
					}}
				>
					{/* Connection lines (as positioned divs) */}
					<div
						style={{
							position: 'absolute',
							top: 180,
							left: 380,
							width: 120,
							height: 2,
							background: 'linear-gradient(90deg, rgba(59,130,246,0.4), rgba(139,92,246,0.2))',
							transform: 'rotate(-30deg)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: 180,
							right: 380,
							width: 120,
							height: 2,
							background: 'linear-gradient(90deg, rgba(139,92,246,0.2), rgba(59,130,246,0.4))',
							transform: 'rotate(30deg)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: 180,
							left: 380,
							width: 120,
							height: 2,
							background: 'linear-gradient(90deg, rgba(59,130,246,0.4), rgba(139,92,246,0.2))',
							transform: 'rotate(30deg)',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: 180,
							right: 380,
							width: 120,
							height: 2,
							background: 'linear-gradient(90deg, rgba(139,92,246,0.2), rgba(59,130,246,0.4))',
							transform: 'rotate(-30deg)',
						}}
					/>

					{/* Node dots */}
					<div
						style={{
							position: 'absolute',
							top: 140,
							left: 320,
							width: 40,
							height: 40,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
							opacity: 0.6,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							top: 140,
							right: 320,
							width: 40,
							height: 40,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
							opacity: 0.6,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: 140,
							left: 320,
							width: 40,
							height: 40,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
							opacity: 0.6,
						}}
					/>
					<div
						style={{
							position: 'absolute',
							bottom: 140,
							right: 320,
							width: 40,
							height: 40,
							borderRadius: '50%',
							background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
							opacity: 0.6,
						}}
					/>
				</div>

				{/* Logo + text */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						zIndex: 10,
					}}
				>
					<div
						style={{
							fontSize: 72,
							fontWeight: 800,
							color: '#fafafa',
							letterSpacing: '-0.02em',
							marginBottom: 16,
						}}
					>
						Shiko
					</div>
					<div
						style={{
							fontSize: 28,
							color: '#a1a1aa',
							letterSpacing: '0.01em',
						}}
					>
						AI-Powered Mind Mapping
					</div>
					<div
						style={{
							fontSize: 20,
							color: '#71717a',
							marginTop: 12,
						}}
					>
						Transform thoughts into connected knowledge
					</div>
				</div>
			</div>
		),
		{ ...size },
	);
}
