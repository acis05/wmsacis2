import type {ReactNode} from 'react';
export default function PageHeader({title,subtitle,actions}:{title:string;subtitle?:string;actions?:ReactNode}){return <div className="page-header"><div><h1 className="title">{title}</h1>{subtitle&&<p className="subtitle">{subtitle}</p>}</div>{actions&&<div className="page-actions">{actions}</div>}</div>}
